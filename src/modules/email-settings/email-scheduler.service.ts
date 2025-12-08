import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { User } from '../../entities/user.entity';
import { EmailService } from './email.service';
import { EmailTemplate, EmailTriggerType } from './entities';
import { SendEmailDto } from './dto';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { CronLoggingService } from './cron-logging.service';

@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @Inject(forwardRef(() => EmailService))
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
    private cronLoggingService: CronLoggingService,
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

      // Obtener nombre del gimnasio
      let gymName = 'GYM Manager';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
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

          await this.emailService.sendEmail({
            templateId: template.id,
            recipientEmail: user.email,
            recipientName: `${user.firstName} ${user.lastName}`,
            memberId: member.id,
            variables,
          });

          this.logger.log(`Birthday email sent to ${user.email}`);
          emailsSent++;
        } catch (error) {
          this.logger.error(`Failed to send birthday email to member ${member.id}`, error);
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

      // Obtener nombre del gimnasio
      let gymName = 'GYM Manager';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
        }
      } catch (gymError) {
        this.logger.warn(`Failed to get gym settings: ${gymError.message}`);
      }

      let emailsSent = 0;
      for (const membership of anniversaries) {
        try {
          const member = membership.member;
          const user = member.user;
          const yearsOfMembership = new Date().getFullYear() - new Date(membership.createdAt).getFullYear();

          const variables = {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            membershipType: membership.membership.name,
            years: yearsOfMembership.toString(),
            gymName: gymName,
          };

          // Generar código de descuento si está configurado
          if (template.includeDiscountCode) {
            variables['discount'] = `${template.discountCodePercentage}%`;
            variables['code'] = this.generatePromoCode('ANNV');
          }

          await this.emailService.sendEmail({
            templateId: template.id,
            recipientEmail: user.email,
            recipientName: `${user.firstName} ${user.lastName}`,
            memberId: member.id,
            variables,
          });

          this.logger.log(`Anniversary email sent to ${user.email}`);
          emailsSent++;
        } catch (error) {
          this.logger.error(`Failed to send anniversary email to member ${membership.member.id}`, error);
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
  private async getAnniversariesToday(): Promise<MemberMembership[]> {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return this.memberMembershipRepository
      .createQueryBuilder('membership')
      .leftJoinAndSelect('membership.member', 'member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('membership.membership', 'membershipType')
      .where(`DATE_FORMAT(membership.createdAt, '%m-%d') = :monthDay`, {
        monthDay: `${month}-${day}`,
      })
      .andWhere('membership.paymentStatus = :paymentStatus', { paymentStatus: 'paid' })
      .getMany();
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
