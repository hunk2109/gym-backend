import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailConfig, EmailTemplate, EmailLog, PaymentReminder } from './entities';
import { BulkPromotion } from '../../entities/bulk-promotion.entity';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Coupon } from '../../entities/coupon.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailTemplateService } from './email-template.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { PaymentReminderService } from './payment-reminder.service';
import { AutoEmailService } from './auto-email.service';
import { BulkPromotionService } from './bulk-promotion.service';
import { EmailDuplicateCheckerService } from './email-duplicate-checker.service';
import { EmailSettingsController } from './email-settings.controller';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailConfig,
      EmailTemplate,
      EmailLog,
      PaymentReminder,
      BulkPromotion,
      Member,
      User,
      MemberMembership,
      GymSettings,
      Coupon,
      Promotion,
    ]),
    ScheduleModule.forRoot(),
    GymSettingsModule,
    CouponsModule,
  ],
  controllers: [EmailSettingsController],
  providers: [
    EmailService,
    EmailConfigService,
    EmailTemplateService,
    EmailSchedulerService,
    PaymentReminderService,
    AutoEmailService,
    BulkPromotionService,
    EmailDuplicateCheckerService,
  ],
  exports: [
    EmailService,
    EmailConfigService,
    EmailTemplateService,
    EmailSchedulerService,
    PaymentReminderService,
    AutoEmailService,
    BulkPromotionService,
    EmailDuplicateCheckerService,
  ],
})
export class EmailSettingsModule {}
