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
import { Payment } from '../../entities/payment.entity';
import { Attendance } from '../../entities/attendance.entity';
import { CashRegister } from '../../entities/cash-register.entity';
import { AppConfig } from '../../entities/app-config.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Sale,
      Employee,
      Member,
      MemberMembership,
      Membership,
      Payment,
      Attendance,
      CashRegister,
      AppConfig,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
