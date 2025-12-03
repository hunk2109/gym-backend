import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsService } from './memberships.service';
import { MembershipsController, MemberMembershipsController } from './memberships.controller';
import { MembershipsSeeder } from './memberships.seeder';
import { MembershipsCronService } from './memberships.cron';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Membership, MemberMembership, Member])],
  controllers: [MembershipsController, MemberMembershipsController],
  providers: [MembershipsService, MembershipsSeeder, MembershipsCronService],
  exports: [MembershipsService],
})
export class MembershipsModule implements OnModuleInit {
  constructor(private seeder: MembershipsSeeder) {}

  async onModuleInit() {
    await this.seeder.seed();
  }
}
