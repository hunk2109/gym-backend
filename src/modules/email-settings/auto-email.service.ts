import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Coupon } from '../../entities/coupon.entity';
import { EmailLog, EmailType, EmailStatus } from './entities/email-log.entity';
import { EmailService } from './email.service';
import { EmailTemplateBuilder, GymConfig } from './email-template.builder';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { CouponsService } from '../coupons/coupons.service';
import { EmailDuplicateCheckerService } from './email-duplicate-checker.service';
import { CronLoggingService } from './cron-logging.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';

@Injectable()
export class AutoEmailService {
  private readonly logger = new Logger(AutoEmailService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(GymSettings)
    private gymSettingsRepository: Repository<GymSettings>,
    @InjectRepository(Coupon)
    private couponRepository: Repository<Coupon>,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    private dataSource: DataSource,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
    private couponsService: CouponsService,
    private duplicateChecker: EmailDuplicateCheckerService,
    private cronLoggingService: CronLoggingService,
    private outboxService: OutboxService,
  ) {}

  /**
   * CRON: Cada 30 minutos
   * Ejecuta todos los chequeos automáticos
   */
  @Cron('*/30 * * * *')
  async processAutoEmails() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'AutoEmailJob',
      'Sending automatic emails every 30 minutes',
    );

    try {
      this.logger.log('🤖 Iniciando proceso de emails automáticos...');

      // Obtener configuración del gym
      const gymSettings = await this.getGymSettings();
      if (gymSettings?.enableExpirationWarnings === false) {
        this.logger.log('Avisos preventivos de vencimiento desactivados en configuración');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      const gymConfig: GymConfig = {
        gymName: gymSettings?.gymName || 'Gym Manager',
        email: gymSettings?.email || '',
        phone: gymSettings?.phone,
        address: gymSettings?.address,
        website: gymSettings?.website,
      };

      // Ejecutar procesos de vencimiento (los cumpleaños se gestionan centralizadamente a las 8 AM en BirthdayEmailScheduler)
      const results = await Promise.all([
        this.checkMembershipDueToday(gymConfig),
        this.checkMembershipDueSoon(gymConfig),
        this.checkMembershipOverdue(gymConfig),
      ]);

      const totalEmailsSent = results.reduce((sum, count) => sum + count, 0);
      const executionTimeMs = Date.now() - startTime;

      await this.cronLoggingService.logCronSuccess(
        logId,
        totalEmailsSent,
        executionTimeMs,
      );

      this.logger.log(
        `✅ Proceso de emails automáticos completado. ${totalEmailsSent} emails enviados en ${executionTimeMs}ms`,
      );
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronError(
        logId,
        error.message || 'Unknown error',
        executionTimeMs,
      );
      this.logger.error('❌ Error en proceso de emails automáticos:', error);
    }
  }

  /**
   * Enviar emails de cumpleaños a miembros que cumplen años hoy
   */
  private async checkBirthdayEmails(gymConfig: GymConfig): Promise<number> {
    let emailsSent = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      this.logger.log(`🔍 Buscando cumpleaños para: ${today.getMonth() + 1}-${today.getDate()}`);

      // Buscar miembros que cumplen años hoy
      const members = await this.memberRepository
        .createQueryBuilder('member')
        .leftJoinAndSelect('member.user', 'user')
        .where('MONTH(member.dateOfBirth) = :month', { month: today.getMonth() + 1 })
        .andWhere('DAY(member.dateOfBirth) = :day', { day: today.getDate() })
        .getMany();

      this.logger.log(`🎂 Encontrados ${members.length} cumpleaños hoy`);
      if (members.length > 0) {
        members.forEach(m => this.logger.log(`  - ${m.user?.firstName}: ${m.dateOfBirth}`));
      }

      for (const member of members) {
        if (!member.user?.email || member.user.email.endsWith('.local') || member.user.email.endsWith('.test') || member.user.email.includes('example.com')) continue;
        if (member.notificationsEnabled === false || member.receiveEmails === false) continue;

        // ✅ VALIDAR DUPLICADOS: Verificar si ya enviamos email de cumpleaños hace menos de 24 horas
        const isDuplicate = await this.duplicateChecker.isDuplicate({
          emailType: EmailType.BIRTHDAY,
          memberId: member.id,
          recipientEmail: member.user.email,
          minutesThreshold: 1440, // 24 horas para cumpleaños
        });

        if (isDuplicate) {
          this.logger.warn(`⏭️ Email de cumpleaños ya enviado a ${member.user.email}, saltando...`);
          continue;
        }

        const birthDate = new Date(member.dateOfBirth);
        const age = today.getFullYear() - birthDate.getFullYear();
        const subject = `🎉 ¡Feliz Cumpleaños ${member.user.firstName}!`;
        
        let message = `Esperamos que disfrutes tu día especial. Desde ${gymConfig.gymName}, te deseamos un excelente cumpleaños número ${age}.`;
        
        // Cargar cupón de descuento si está habilitado
        const settings = await this.gymSettingsRepository.findOne({
          where: {},
        });

        if (settings?.birthdayDiscountEnabled && settings?.birthdayDiscountCouponId) {
          // Buscar el cupón en tabla promotions
          const promos = await this.dataSource.query(
            'SELECT * FROM promotions WHERE id = ?',
            [settings.birthdayDiscountCouponId]
          );

          if (promos.length > 0) {
            const coupon = promos[0];
            message += `\n\n🎁 Recibe ${coupon.discountPercentage}% de descuento usando el código: ${coupon.code}`;
          }
        }

        const htmlContent = EmailTemplateBuilder.customTemplate(
          subject,
          message,
          'Accede a tu cuenta',
          gymConfig
        );

        await this.emailService.sendEmail({
          recipientEmail: member.user.email,
          recipientName: member.user.firstName,
          subject,
          htmlContent,
          plainTextContent: message,
        });

        // ✅ REGISTRAR EN LOG: Guardar en email_logs con tipo BIRTHDAY
        const log = this.emailLogRepository.create({
          recipientEmail: member.user.email,
          recipientName: member.user.firstName,
          memberId: member.id,
          subject,
          htmlContent,
          emailType: EmailType.BIRTHDAY,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
        await this.emailLogRepository.save(log);

        this.logger.log(`✅ Email de cumpleaños enviado a: ${member.user.email}`);
        emailsSent++;
      }
    } catch (error) {
      this.logger.error('Error en checkBirthdayEmails:', error);
    }
    return emailsSent;
  }

  /**
   * Enviar emails a miembros cuya membresía vence HOY
   */
  private async checkMembershipDueToday(gymConfig: GymConfig): Promise<number> {
    let emailsSent = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Buscar membresías que vencen hoy
      const memberships = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('mm.membership', 'membership')
        .where('mm.endDate >= :today', { today })
        .andWhere('mm.endDate < :tomorrow', { tomorrow })
        .getMany();

      this.logger.log(`⏰ Encontradas ${memberships.length} membresías venciendo hoy`);

      for (const membershipRecord of memberships) {
        if (!membershipRecord.member?.user?.email || membershipRecord.member.user.email.endsWith('.local') || membershipRecord.member.user.email.endsWith('.test') || membershipRecord.member.user.email.includes('example.com')) continue;
        if (membershipRecord.member?.notificationsEnabled === false) continue;

        // ✅ VALIDAR DUPLICADOS: Verificar si ya enviamos recordatorio de vencimiento en últimas 24 horas
        const isDuplicate = await this.duplicateChecker.isDuplicate({
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          memberId: membershipRecord.member.id,
          recipientEmail: membershipRecord.member.user.email,
          minutesThreshold: 1440, // 24 horas
        });

        if (isDuplicate) {
          this.logger.warn(
            `⏭️ Email de vencimiento hoy ya enviado a ${membershipRecord.member.user.email}, saltando...`,
          );
          continue;
        }

        const member = membershipRecord.member;
        const membership = membershipRecord.membership;
        const dueDate = new Date(membershipRecord.endDate).toLocaleDateString('es-ES');

        const subject = `⏰ Tu membresía vence hoy`;
        const message = `Hola ${member.user.firstName},\n\nTu membresía ${membership.name} vence HOY (${dueDate}).\n\nPara continuar disfrutando de nuestros servicios, por favor renueva tu membresía lo antes posible.\n\n¡No quieras perder acceso a tu rutina de entrenamiento!`;

        const htmlContent = EmailTemplateBuilder.paymentReminderEmail(
          member.user.firstName,
          'DUE_DATE',
          message,
          gymConfig
        );

        if (member.receiveEmails !== false) {
          await this.outboxService.enqueueEmail({
            recipient: member.user.email,
            recipientName: member.user.firstName,
            subject,
            htmlContent,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_due_today', memberId: member.id },
          });
        }

        if (member.user.phone && member.receiveWhatsapp !== false) {
          await this.outboxService.enqueueWhatsapp({
            recipient: member.user.phone,
            recipientName: member.user.firstName,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_due_today', memberId: member.id },
          });
        }

        // ✅ REGISTRAR EN LOG en checkMembershipDueToday
        const logDueToday = this.emailLogRepository.create({
          recipientEmail: member.user.email,
          recipientName: member.user.firstName,
          memberId: member.id,
          subject,
          htmlContent,
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
        await this.emailLogRepository.save(logDueToday);

        this.logger.log(`✅ Aviso de vencimiento hoy encolado en Outbox para: ${member.user.email}`);
        emailsSent++;
      }
    } catch (error) {
      this.logger.error('Error en checkMembershipDueToday:', error);
    }
    return emailsSent;
  }

  /**
   * Enviar emails a miembros cuya membresía vence en los próximos 3 días
   */
  private async checkMembershipDueSoon(gymConfig: GymConfig): Promise<number> {
    let emailsSent = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inThreeDays = new Date(today);
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      inThreeDays.setHours(0, 0, 0, 0);

      // Buscar membresías que vencen en los próximos 3 días (pero no hoy)
      const memberships = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('mm.membership', 'membership')
        .where('mm.endDate > :today', { today })
        .andWhere('mm.endDate <= :inThreeDays', { inThreeDays })
        .getMany();

      this.logger.log(`📅 Encontradas ${memberships.length} membresías venciendo pronto`);

      for (const membershipRecord of memberships) {
        if (!membershipRecord.member?.user?.email || membershipRecord.member.user.email.endsWith('.local') || membershipRecord.member.user.email.endsWith('.test') || membershipRecord.member.user.email.includes('example.com')) continue;
        if (membershipRecord.member?.notificationsEnabled === false) continue;

        // ✅ VALIDAR DUPLICADOS: Verificar si ya enviamos recordatorio en últimas 72 horas (3 días)
        const isDuplicate = await this.duplicateChecker.isDuplicate({
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          memberId: membershipRecord.member.id,
          recipientEmail: membershipRecord.member.user.email,
          minutesThreshold: 4320, // 72 horas (3 días)
        });

        if (isDuplicate) {
          this.logger.warn(
            `⏭️ Email de vencimiento próximo ya enviado a ${membershipRecord.member.user.email}, saltando...`,
          );
          continue;
        }

        const member = membershipRecord.member;
        const membership = membershipRecord.membership;
        const daysLeft = Math.ceil(
          (new Date(membershipRecord.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const dueDate = new Date(membershipRecord.endDate).toLocaleDateString('es-ES');

        const subject = `📅 Tu membresía vence en ${daysLeft} días`;
        const message = `Hola ${member.user.firstName},\n\nTe recordamos que tu membresía ${membership.name} vence en ${daysLeft} días (${dueDate}).\n\nRenuévala ahora para no perder acceso a nuestros servicios.\n\nActúa hoy y obtén un descuento especial de renovación.`;

        const htmlContent = EmailTemplateBuilder.paymentReminderEmail(
          member.user.firstName,
          'BEFORE_DUE',
          message,
          gymConfig
        );

        if (member.receiveEmails !== false) {
          await this.outboxService.enqueueEmail({
            recipient: member.user.email,
            recipientName: member.user.firstName,
            subject,
            htmlContent,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_due_soon', memberId: member.id },
          });
        }

        if (member.user.phone && member.receiveWhatsapp !== false) {
          await this.outboxService.enqueueWhatsapp({
            recipient: member.user.phone,
            recipientName: member.user.firstName,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_due_soon', memberId: member.id },
          });
        }

        // ✅ REGISTRAR EN LOG
        const logDueSoon = this.emailLogRepository.create({
          recipientEmail: member.user.email,
          recipientName: member.user.firstName,
          memberId: member.id,
          subject,
          htmlContent,
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
        await this.emailLogRepository.save(logDueSoon);

        this.logger.log(`✅ Aviso de vencimiento próximo encolado en Outbox para: ${member.user.email}`);
        emailsSent++;
      }
    } catch (error) {
      this.logger.error('Error en checkMembershipDueSoon:', error);
    }
    return emailsSent;
  }

  /**
   * Enviar emails a miembros cuya membresía ya ha vencido
   */
  private async checkMembershipOverdue(gymConfig: GymConfig): Promise<number> {
    let emailsSent = 0;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar membresías que ya vencieron
      const memberships = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .leftJoinAndSelect('mm.membership', 'membership')
        .where('mm.endDate < :today', { today })
        .getMany();

      this.logger.log(`⚠️ Encontradas ${memberships.length} membresías vencidas`);

      for (const membershipRecord of memberships) {
        if (!membershipRecord.member?.user?.email || membershipRecord.member.user.email.endsWith('.local') || membershipRecord.member.user.email.endsWith('.test') || membershipRecord.member.user.email.includes('example.com')) continue;
        if (membershipRecord.member?.notificationsEnabled === false) continue;

        // ✅ VALIDAR DUPLICADOS: Verificar si ya enviamos recordatorio en últimas 7 días
        const isDuplicate = await this.duplicateChecker.isDuplicate({
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          memberId: membershipRecord.member.id,
          recipientEmail: membershipRecord.member.user.email,
          minutesThreshold: 10080, // 7 días
        });

        if (isDuplicate) {
          this.logger.warn(
            `⏭️ Email de membresía vencida ya enviado a ${membershipRecord.member.user.email}, saltando...`,
          );
          continue;
        }

        const member = membershipRecord.member;
        const membership = membershipRecord.membership;
        const dueDate = new Date(membershipRecord.endDate).toLocaleDateString('es-ES');
        const daysOverdue = Math.floor(
          (Date.now() - new Date(membershipRecord.endDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        const subject = `⚠️ Tu membresía ha vencido`;
        const message = `Hola ${member.user.firstName},\n\nTu membresía ${membership.name} ha vencido desde el ${dueDate} (hace ${daysOverdue} días).\n\nTu acceso al gimnasio ha sido suspendido.\n\nPor favor, renueva tu membresía de inmediato para reactivar tu cuenta.`;

        const htmlContent = EmailTemplateBuilder.paymentReminderEmail(
          member.user.firstName,
          'OVERDUE',
          message,
          gymConfig
        );

        if (member.receiveEmails !== false) {
          await this.outboxService.enqueueEmail({
            recipient: member.user.email,
            recipientName: member.user.firstName,
            subject,
            htmlContent,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_overdue', memberId: member.id },
          });
        }

        if (member.user.phone && member.receiveWhatsapp !== false) {
          await this.outboxService.enqueueWhatsapp({
            recipient: member.user.phone,
            recipientName: member.user.firstName,
            content: message,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'auto_email_overdue', memberId: member.id },
          });
        }

        // ✅ REGISTRAR EN LOG
        const logOverdue = this.emailLogRepository.create({
          recipientEmail: member.user.email,
          recipientName: member.user.firstName,
          memberId: member.id,
          subject,
          htmlContent,
          emailType: EmailType.MEMBERSHIP_EXPIRY,
          status: EmailStatus.SENT,
          sentAt: new Date(),
        });
        await this.emailLogRepository.save(logOverdue);

        this.logger.log(`✅ Aviso de membresía vencida encolado en Outbox para: ${member.user.email}`);
        emailsSent++;
      }
    } catch (error) {
      this.logger.error('Error en checkMembershipOverdue:', error);
    }
    return emailsSent;
  }

  /**
   * Obtener configuración del gimnasio
   */
  private async getGymSettings(): Promise<any> {
    try {
      const settings = await this.gymSettingsRepository.find();
      return settings.length > 0 ? settings[0] : null;
    } catch (error) {
      this.logger.error('Error obteniendo configuración del gimnasio:', error);
      return null;
    }
  }

  /**
   * Método auxiliar para formatear mensajes
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n');
  }
}
