import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupMembership } from '../../entities/group-membership.entity';
import { GroupMembershipUser } from '../../entities/group-membership-user.entity';
import { User } from '../../entities/user.entity';
import { Membership } from '../../entities/membership.entity';
import { GroupMembershipsService } from './group-memberships.service';
import { GroupMembershipsController } from './group-memberships.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupMembership,
      GroupMembershipUser,
      User,
      Membership,
    ]),
  ],
  controllers: [GroupMembershipsController],
  providers: [GroupMembershipsService],
  exports: [GroupMembershipsService],
})
export class GroupMembershipsModule {}
