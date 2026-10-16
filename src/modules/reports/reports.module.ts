import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { Payment } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymClass } from '../../entities/gym-class.entity';
import { ClassEnrollment } from '../../entities/class-enrollment.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Attendance } from '../../entities/attendance.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { Payroll } from '../../entities/payroll.entity';
import { AccountPayable } from '../../entities/account-payable.entity';
import { CashRegisterTransaction } from '../../entities/cash-register-transaction.entity';
import { ReportsService } from './reports.service';
import { PromotionsReportService } from './promotions-report.service';
import { BirthdayReportService } from './birthday-report.service';
import { DailySummaryService } from './daily-summary.service';
import { FinancialAnalyticsService } from './financial-analytics.service';
import { ReportsController } from './reports.controller';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { WhatsappSettingsModule } from '../whatsapp-settings/whatsapp-settings.module';

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
      Promotion,
      Attendance,
      GymSettings,
      Payroll,
      AccountPayable,
      CashRegisterTransaction,
    ]),
    EmailSettingsModule,
    WhatsappSettingsModule,
  ],
  providers: [
    ReportsService,
    PromotionsReportService,
    BirthdayReportService,
    DailySummaryService,
    FinancialAnalyticsService,
  ],
  controllers: [ReportsController],
  exports: [
    ReportsService,
    PromotionsReportService,
    BirthdayReportService,
    DailySummaryService,
    FinancialAnalyticsService,
  ],
})
export class ReportsModule {}
