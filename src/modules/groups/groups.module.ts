import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from '../../entities/group.entity';
import { GroupCompanion } from '../../entities/group-companion.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { User } from '../../entities/user.entity';
import { Payment } from '../../entities/payment.entity';
import { GroupsService } from './groups.service';
import { GroupsController } from './groups.controller';
import { EmailSettingsModule } from '../email-settings/email-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Group,
      GroupCompanion,
      Member,
      Membership,
      MemberMembership,
      User,
      Payment,
    ]),
    EmailSettingsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
