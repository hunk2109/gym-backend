import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MemberMembershipsService } from './member-memberships.service';
import { MemberMembershipsController } from './member-memberships.controller';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { Payment } from '../../entities/payment.entity';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MemberMembership, Member, Membership, Payment]),
    PromotionsModule,
  ],
  controllers: [MemberMembershipsController],
  providers: [MemberMembershipsService],
  exports: [MemberMembershipsService],
})
export class MemberMembershipsModule {}
