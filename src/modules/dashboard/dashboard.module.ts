import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../../entities/user.entity';
import { Sale } from '../../entities/sale.entity';
import { Employee } from '../../entities/employee.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Membership } from '../../entities/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Sale, Employee, Member, MemberMembership, Membership])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
