import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PaymentReminder, ReminderType, ReminderFrequency } from './entities';
import { CreatePaymentReminderDto, UpdatePaymentReminderDto } from './dto';
import { EmailService } from './email.service';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { CronLoggingService } from './cron-logging.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';

@Injectable()
export class PaymentReminderService {
  private readonly logger = new Logger(PaymentReminderService.name);

  constructor(
    @InjectRepository(PaymentReminder)
    private reminderRepository: Repository<PaymentReminder>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
    private cronLoggingService: CronLoggingService,
    private whatsappService: WhatsappService,
  ) {}

  async createReminder(dto: CreatePaymentReminderDto): Promise<PaymentReminder> {
    // Verificar que el miembro existe
    const member = await this.memberRepository.findOne({ where: { id: dto.memberId } });
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    const reminder = this.reminderRepository.create({
      ...dto,
      nextSendAt: this.calculateNextSendDate(dto.frequency),
    });

    return this.reminderRepository.save(reminder);
  }

  async getAllReminders(): Promise<PaymentReminder[]> {
    return this.reminderRepository.find({
      relations: ['member', 'member.user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getReminderById(id: string): Promise<PaymentReminder> {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
      relations: ['member', 'member.user'],
    });
    if (!reminder) {
      throw new BadRequestException('Payment reminder not found');
    }
    return reminder;
  }

  async updateReminder(id: string, dto: UpdatePaymentReminderDto): Promise<PaymentReminder> {
    const reminder = await this.getReminderById(id);
    Object.assign(reminder, dto);
    if (dto.frequency) {
      reminder.nextSendAt = this.calculateNextSendDate(dto.frequency);
    }
    return this.reminderRepository.save(reminder);
  }

  async deleteReminder(id: string): Promise<void> {
    const reminder = await this.getReminderById(id);
    await this.reminderRepository.delete(id);
  }

  async toggleReminder(id: string): Promise<PaymentReminder> {
    const reminder = await this.getReminderById(id);
    reminder.isActive = !reminder.isActive;
    return this.reminderRepository.save(reminder);
  }

  // ============ AUTOMATED TASKS ============

  /**
   * Ejecutarse cada 30 minutos para enviar recordatorios de pago
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendPaymentReminders() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'PaymentReminderJob',
      'Sending payment reminders every 30 minutes',
    );

    try {
      this.logger.log('Iniciando proceso de envío de recordatorios de pago...');

      const gymSettings = await this.gymSettingsService.getSettings();
      if (gymSettings?.enablePaymentReminders === false) {
        this.logger.log('Payment reminders are disabled in gym settings');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      const reminders = await this.reminderRepository.find({
        where: {
          isActive: true,
          nextSendAt: LessThanOrEqual(new Date()),
        },
        relations: ['member'],
      });

      let remindersSent = 0;
      for (const reminder of reminders) {
        const sent = await this.processReminder(reminder);
        if (sent) remindersSent++;
      }

      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronSuccess(logId, remindersSent, executionTimeMs);
      this.logger.log(`Procesados ${remindersSent} recordatorios de pago en ${executionTimeMs}ms`);
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronError(
        logId,
        error.message || 'Unknown error',
        executionTimeMs,
      );
      this.logger.error('Error sending payment reminders', error);
    }
  }

  private async processReminder(reminder: PaymentReminder): Promise<boolean> {
    try {
      // Obtener la membresía activa del miembro
      // FILTRO: Solo procesar si membershipType != 'companion'
      let memberMembership = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .where('mm.memberId = :memberId', { memberId: reminder.memberId })
        .andWhere('(mm.membershipType IS NULL OR mm.membershipType IN (:...types))', { types: ['individual', 'responsible'] })
        .leftJoinAndSelect('mm.membership', 'membership')
        .orderBy('mm.createdAt', 'DESC')
        .getOne();

      if (!memberMembership) {
        this.logger.warn(`No active membership found for member ${reminder.memberId} (not companion)`);
        return false;
      }

      // Calcular si debe enviarse el recordatorio
      const shouldSend = this.shouldSendReminder(reminder, memberMembership);
      if (!shouldSend) {
        reminder.nextSendAt = this.calculateNextSendDate(reminder.frequency);
        await this.reminderRepository.save(reminder);
        return false;
      }

      // Preparar datos del email
      const member = reminder.member;
      const memberUser = member.user;

      if (!memberUser) {
        throw new Error(`User not found for member ${member.id}`);
      }

      // Obtener configuración del gimnasio
      const gymSettings = await this.gymSettingsService.getSettings();
      const notificationChannel = gymSettings?.notificationChannel || 'both';

      const subject = this.getReminderSubject(reminder.type);
      const htmlContent = this.getReminderTemplate(reminder, member, memberMembership, gymSettings);
      const plainText = this.stripHtml(htmlContent);

      const sendEmail = notificationChannel === 'both' || notificationChannel === 'email';
      const sendWhatsapp = notificationChannel === 'both' || notificationChannel === 'whatsapp';

      if (sendEmail && memberUser.email) {
        await this.emailService.sendEmailDirect({
          to: memberUser.email,
          subject,
          html: htmlContent,
          text: plainText,
        });
        this.logger.log(`Payment reminder email sent to ${memberUser.email}`);
      }

      if (sendWhatsapp && memberUser.phone) {
        try {
          await this.whatsappService.sendMessage(memberUser.phone, plainText);
          this.logger.log(`Payment reminder whatsapp sent to ${memberUser.phone}`);
        } catch (waError) {
          this.logger.error(`Failed to send WhatsApp reminder to ${memberUser.phone}:`, waError);
        }
      }

      // Actualizar recordatorio
      reminder.lastSentAt = new Date();
      reminder.retryCount = 0;
      reminder.lastErrorMessage = '';
      reminder.nextSendAt = this.calculateNextSendDate(reminder.frequency);

      await this.reminderRepository.save(reminder);
      this.logger.log(`Payment reminder sent to ${memberUser.email}`);
      return true;
    } catch (error) {
      this.logger.error(`Error processing reminder ${reminder.id}:`, error);

      // Reintentar
      reminder.retryCount++;
      if (reminder.retryCount < reminder.maxRetries) {
        reminder.nextSendAt = new Date(Date.now() + 5 * 60 * 1000); // Reintentar en 5 minutos
        reminder.lastErrorMessage = error.message;
      } else {
        reminder.isActive = false;
        reminder.lastErrorMessage = `Max retries exceeded: ${error.message}`;
        this.logger.error(`Payment reminder ${reminder.id} disabled after max retries`);
      }

      await this.reminderRepository.save(reminder);
      return false;
    }
  }

  private shouldSendReminder(reminder: PaymentReminder, memberMembership: any): boolean {
    const now = new Date();
    const dueDate = memberMembership.endDate;

    switch (reminder.type) {
      case ReminderType.DUE_DATE:
        // Enviar en la fecha de vencimiento
        return this.isToday(dueDate);

      case ReminderType.BEFORE_DUE:
        // Enviar X días antes del vencimiento
        const daysBeforeDate = new Date(dueDate);
        daysBeforeDate.setDate(daysBeforeDate.getDate() - reminder.daysBeforeDue);
        return this.isToday(daysBeforeDate);

      case ReminderType.OVERDUE:
        // Enviar si está vencido
        return now > dueDate;

      default:
        return false;
    }
  }

  private getReminderSubject(type: ReminderType): string {
    switch (type) {
      case ReminderType.DUE_DATE:
        return '⏰ Tu membresía vence hoy';
      case ReminderType.BEFORE_DUE:
        return '📅 Tu membresía vence pronto';
      case ReminderType.OVERDUE:
        return '⚠️ Tu membresía ha vencido';
      default:
        return 'Recordatorio de pago';
    }
  }

  private getReminderTemplate(reminder: PaymentReminder, member: any, memberMembership: any, gymSettings?: any): string {
    const { membership } = memberMembership;
    const dueDate = new Date(memberMembership.endDate).toLocaleDateString('es-ES');

    const messages = {
      [ReminderType.DUE_DATE]: `Tu membresía <strong>${membership.name}</strong> vence hoy <strong>${dueDate}</strong>. Para continuar disfrutando de nuestros servicios, por favor renueva tu membresía lo antes posible.`,
      [ReminderType.BEFORE_DUE]: `Te recordamos que tu membresía <strong>${membership.name}</strong> vence el <strong>${dueDate}</strong>. Renuévala ahora para no perder acceso a nuestros servicios.`,
      [ReminderType.OVERDUE]: `Tu membresía <strong>${membership.name}</strong> ha vencido desde el <strong>${dueDate}</strong>. Tu acceso al gimnasio ha sido suspendido. Por favor, renueva tu membresía de inmediato.`,
    };

    // Importar EmailTemplateBuilder dinámicamente
    const { EmailTemplateBuilder } = require('./email-template.builder');
    
    // Preparar configuración del gimnasio
    const gymConfig = gymSettings ? {
      gymName: gymSettings.gymName,
      email: gymSettings.email,
      phone: gymSettings.phone,
      address: gymSettings.address,
      website: gymSettings.website,
    } : undefined;
    
    return EmailTemplateBuilder.paymentReminderEmail(
      member.firstName,
      reminder.type,
      messages[reminder.type] || 'Recordatorio de pago',
      gymConfig
    );
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  private calculateNextSendDate(frequency: ReminderFrequency): Date {
    const next = new Date();
    switch (frequency) {
      case ReminderFrequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ReminderFrequency.THREE_DAYS:
        next.setDate(next.getDate() + 3);
        break;
      case ReminderFrequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ReminderFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
    }
    return next;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
