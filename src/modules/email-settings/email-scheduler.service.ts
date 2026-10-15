import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Payment } from '../../entities/payment.entity';
import { User } from '../../entities/user.entity';
import { EmailService } from './email.service';
import { EmailTemplate, EmailTriggerType } from './entities';
import { SendEmailDto } from './dto';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { CronLoggingService } from './cron-logging.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
    private cronLoggingService: CronLoggingService,
    private whatsappService: WhatsappService,
    private outboxService: OutboxService,
  ) {}

  /**
   * Ejecuta todos los días a las 8:00 AM
   * Busca miembros con cumpleaños hoy y envía correo
   */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendBirthdayEmails() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'BirthdayEmailScheduler',
      'Sending birthday emails at 8 AM',
    );

    try {
      this.logger.log('Starting birthday email scheduler...');

      const today = new Date();
      const birthdays = await this.getBirthdaysToday();

      if (birthdays.length === 0) {
        this.logger.log('No birthdays today');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      const template = await this.emailTemplateRepository.findOne({
        where: { triggerType: EmailTriggerType.BIRTHDAY, isActive: true },
      });

      if (!template) {
        this.logger.warn('Birthday email template not configured');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      let gymName = 'GYM Manager';
      let notificationChannel = 'both';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        
        if (gymSettings?.enableBirthdayEmails === false) {
          this.logger.log('Birthday emails are disabled in gym settings');
          await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
          return;
        }

        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
        }
        if (gymSettings?.notificationChannel) {
          notificationChannel = gymSettings.notificationChannel;
        }
      } catch (gymError) {
        this.logger.warn(`Failed to get gym settings: ${gymError.message}`);
      }

      let emailsSent = 0;
      for (const member of birthdays) {
        try {
          const user = member.user;
          const variables = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            membershipType: member.memberships?.[0]?.membership?.name || 'Miembro',
            gymName: gymName,
          };

          // Generar código de descuento si está configurado en la plantilla
          if (template.includeDiscountCode) {
            variables['discount'] = `${template.discountCodePercentage}%`;
            variables['code'] = this.generatePromoCode('BDAY');
          }

          const sendEmail = notificationChannel === 'both' || notificationChannel === 'email';
          const sendWhatsapp = notificationChannel === 'both' || notificationChannel === 'whatsapp';

          let rawHtml = template.htmlContent || '<p>¡Feliz Cumpleaños!</p>';
          let rawSubject = template.subject || '¡Feliz Cumpleaños!';
          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            rawHtml = rawHtml.replace(regex, value as string);
            rawSubject = rawSubject.replace(regex, value as string);
          }
          const plainText = rawHtml.replace(/<[^>]*>?/gm, '').trim();

          if (sendEmail && user.email) {
            await this.outboxService.enqueueEmail({
              recipient: user.email,
              recipientName: `${user.firstName} ${user.lastName}`,
              subject: rawSubject,
              htmlContent: rawHtml,
              content: plainText,
              priority: NotificationPriority.NORMAL,
              metadata: { source: 'birthday_scheduler', memberId: member.id, templateId: template.id },
            });
            this.logger.log(`Birthday email encolado en Outbox para ${user.email}`);
            emailsSent++;
          }

          if (sendWhatsapp && user.phone) {
            await this.outboxService.enqueueWhatsapp({
              recipient: user.phone,
              recipientName: `${user.firstName} ${user.lastName}`,
              content: plainText,
              priority: NotificationPriority.NORMAL,
              metadata: { source: 'birthday_scheduler', memberId: member.id },
            });
            this.logger.log(`Birthday whatsapp encolado en Outbox para ${user.phone}`);
          }
        } catch (error) {
          this.logger.error(`Failed to enqueue birthday notification to member ${member.id}`, error);
        }
      }

      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronSuccess(logId, emailsSent, executionTimeMs);
      this.logger.log(`Sent ${emailsSent} birthday emails in ${executionTimeMs}ms`);
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronError(
        logId,
        error.message || 'Unknown error',
        executionTimeMs,
      );
      this.logger.error('Error in birthday email scheduler', error);
    }
  }

  /**
   * Ejecuta todos los días a las 9:00 AM
   * Busca aniversarios de membresía y envía correo
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendAnniversaryEmails() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'AnniversaryEmailScheduler',
      'Sending anniversary emails at 9 AM',
    );

    try {
      this.logger.log('Starting anniversary email scheduler...');

      const anniversaries = await this.getAnniversariesToday();

      if (anniversaries.length === 0) {
        this.logger.log('No membership anniversaries today');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      const template = await this.emailTemplateRepository.findOne({
        where: { triggerType: EmailTriggerType.ANNIVERSARY, isActive: true },
      });

      if (!template) {
        this.logger.warn('Anniversary email template not configured');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      // Obtener configuración del gimnasio
      let gymName = 'GYM Manager';
      let notificationChannel = 'both';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.enableAnniversaryEmails === false) {
          this.logger.log('Anniversary emails are disabled in gym settings');
          await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
          return;
        }
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
        }
        if (gymSettings?.notificationChannel) {
          notificationChannel = gymSettings.notificationChannel;
        }
      } catch (gymError) {
        this.logger.warn(`Failed to get gym settings: ${gymError.message}`);
      }

      let emailsSent = 0;
      for (const anniversary of anniversaries) {
        try {
          const member = anniversary.member;
          const user = member.user;
          const yearsOfMembership = new Date().getFullYear() - new Date(anniversary.paymentDate || new Date()).getFullYear();

          const variables = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            membershipType: 'Membresía', // Payment no tiene relación con Membership entity
            years: yearsOfMembership.toString(),
            gymName: gymName,
          };

          // Generar código de descuento si está configurado
          if (template.includeDiscountCode) {
            variables['discount'] = `${template.discountCodePercentage}%`;
            variables['code'] = this.generatePromoCode('ANNV');
          }

          const sendEmail = notificationChannel === 'both' || notificationChannel === 'email';
          const sendWhatsapp = notificationChannel === 'both' || notificationChannel === 'whatsapp';

          let rawHtml = template.htmlContent || '<p>¡Feliz Aniversario!</p>';
          let rawSubject = template.subject || '¡Feliz Aniversario en el Gimnasio!';
          for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            rawHtml = rawHtml.replace(regex, value as string);
            rawSubject = rawSubject.replace(regex, value as string);
          }
          const plainText = rawHtml.replace(/<[^>]*>?/gm, '').trim();

          if (sendEmail && user.email) {
            await this.outboxService.enqueueEmail({
              recipient: user.email,
              recipientName: `${user.firstName} ${user.lastName}`,
              subject: rawSubject,
              htmlContent: rawHtml,
              content: plainText,
              priority: NotificationPriority.NORMAL,
              metadata: { source: 'anniversary_scheduler', memberId: member.id, templateId: template.id },
            });
            this.logger.log(`Anniversary email encolado en Outbox para ${user.email}`);
            emailsSent++;
          }

          if (sendWhatsapp && user.phone) {
            await this.outboxService.enqueueWhatsapp({
              recipient: user.phone,
              recipientName: `${user.firstName} ${user.lastName}`,
              content: plainText,
              priority: NotificationPriority.NORMAL,
              metadata: { source: 'anniversary_scheduler', memberId: member.id },
            });
            this.logger.log(`Anniversary whatsapp encolado en Outbox para ${user.phone}`);
          }
        } catch (error) {
          this.logger.error(`Failed to enqueue anniversary notification to member ${anniversary.member.id}`, error);
        }
      }

      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronSuccess(logId, emailsSent, executionTimeMs);
      this.logger.log(`Sent ${emailsSent} anniversary emails in ${executionTimeMs}ms`);
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronError(
        logId,
        error.message || 'Unknown error',
        executionTimeMs,
      );
      this.logger.error('Error in anniversary email scheduler', error);
    }
  }

  /**
   * Obtiene todos los miembros con cumpleaños hoy
   */
  private async getBirthdaysToday(): Promise<Member[]> {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    // Query que busca coincidencias de mes y día
    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .leftJoinAndSelect('memberships.membership', 'membership')
      .where(`DATE_FORMAT(member.dateOfBirth, '%m-%d') = :monthDay`, {
        monthDay: `${month}-${day}`,
      })
      .andWhere('member.dateOfBirth IS NOT NULL')
      .getMany();
  }

  /**
   * Obtiene todos los aniversarios de membresía para hoy
   */
  private async getAnniversariesToday(): Promise<Array<{ membershipId: string; paymentId: string | undefined; paymentDate: Date; member: Member }>> {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    const memberMemberships = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .innerJoin('mm.payment', 'payment', 'payment.id = mm.paymentId')
      .leftJoinAndSelect('mm.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .where(`DATE_FORMAT(payment.paymentDate, '%m-%d') = :monthDay`, {
        monthDay: `${month}-${day}`,
      })
      .andWhere('payment.paymentType = :paymentType', { paymentType: 'MEMBERSHIP' })
      .andWhere('payment.status = :paymentStatus', { paymentStatus: 'COMPLETED' })
      .getMany();

    // Mapear a la estructura esperada
    return memberMemberships.map(mm => ({
      membershipId: mm.id,
      paymentId: mm.paymentId,
      paymentDate: mm.createdAt,
      member: mm.member,
    }));
  }

  /**
   * Genera un código promocional único
   */
  private generatePromoCode(prefix: string): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}-${timestamp}`;
  }
}
