import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsSeeder } from './memberships.seeder';
import { MembershipsCronService } from './memberships.cron';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Payment } from '../../entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Membership, MemberMembership, Member, Payment])],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsSeeder, MembershipsCronService],
  exports: [MembershipsService],
})
export class MembershipsModule implements OnModuleInit {
  constructor(private seeder: MembershipsSeeder) {}

  async onModuleInit() {
    await this.seeder.seed();
  }
}
