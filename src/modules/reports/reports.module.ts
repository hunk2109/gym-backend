import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { Payment } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymClass } from '../../entities/gym-class.entity';
import { ClassEnrollment } from '../../entities/class-enrollment.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      Payment,
      Member,
      MemberMembership,
      GymClass,
      ClassEnrollment,
      SaleItem,
    ]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
