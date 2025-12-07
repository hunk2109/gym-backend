import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailConfig, EmailTemplate, EmailLog, PaymentReminder } from './entities';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailTemplateService } from './email-template.service';
import { EmailSchedulerService } from './email-scheduler.service';
import { PaymentReminderService } from './payment-reminder.service';
import { EmailSettingsController } from './email-settings.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailConfig,
      EmailTemplate,
      EmailLog,
      PaymentReminder,
      Member,
      User,
      MemberMembership,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [EmailSettingsController],
  providers: [
    EmailService,
    EmailConfigService,
    EmailTemplateService,
    EmailSchedulerService,
    PaymentReminderService,
  ],
  exports: [
    EmailService,
    EmailConfigService,
    EmailTemplateService,
    EmailSchedulerService,
    PaymentReminderService,
  ],
})
export class EmailSettingsModule {}
