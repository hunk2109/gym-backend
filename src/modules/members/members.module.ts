import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { MembershipValidationService } from '../../services/membership-validation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member, User, MemberMembership])],
  controllers: [MembersController],
  providers: [MembersService, MembershipValidationService],
  exports: [MembersService, MembershipValidationService],
})
export class MembersModule {}
