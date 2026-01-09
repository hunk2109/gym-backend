import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsSeeder } from './memberships.seeder';
import { MembershipsCronService } from './memberships.cron';
import { MembershipAccessScheduleService } from './membership-access-schedule.service';
import { MembershipAccessScheduleController } from './membership-access-schedule.controller';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Payment } from '../../entities/payment.entity';
import { CronExecutionLog } from '../../entities/cron-execution-log.entity';
import { MembershipAccessSchedule } from '../../entities/membership-access-schedule.entity';
import { PromotionsModule } from '../promotions/promotions.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Membership,
      MemberMembership,
      Member,
      Payment,
      CronExecutionLog,
      MembershipAccessSchedule,
    ]),
    PromotionsModule,
    EmailSettingsModule,
    GymSettingsModule,
  ],
  controllers: [MembershipsController, MembershipAccessScheduleController],
  providers: [
    MembershipsService,
    MembershipsSeeder,
    MembershipsCronService,
    MembershipAccessScheduleService,
  ],
  exports: [MembershipsService, MembershipAccessScheduleService],
})
export class MembershipsModule implements OnModuleInit {
  constructor(private seeder: MembershipsSeeder) {}

  async onModuleInit() {
    await this.seeder.seed();
  }
}

