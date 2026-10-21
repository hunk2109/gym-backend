import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Payment } from '../../entities/payment.entity';
import { CashRegister } from '../../entities/cash-register.entity';
import { MembershipValidationService } from '../../services/membership-validation.service';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { ModulesManagementModule } from '../modules-management/modules-management.module';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member, User, MemberMembership, Payment, CashRegister]),
    EmailSettingsModule,
    ModulesManagementModule,
    GymSettingsModule,
    SyncModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, MembershipValidationService],
  exports: [MembersService, MembershipValidationService],
})
export class MembersModule {}
