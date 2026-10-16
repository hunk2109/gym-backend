import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PromotionsReportService } from './promotions-report.service';
import { BirthdayReportService } from './birthday-report.service';
import { FinancialAnalyticsService, FinancialAnalyticsDto } from './financial-analytics.service';
import { DailySummaryService } from './daily-summary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../../entities/user.entity';
import {
  SalesReportDto,
  MembershipReportDto,
  PaymentReportDto,
  RevenueReportDto,
  MemberActivityReportDto,
  RefundAnalysisDto,
  ForecastReportDto,
  ComprehensiveReportDto,
} from './dto/report-response.dto';
import { ReportRequestDto, SalesReportRequestDto, MembershipReportRequestDto, PaymentReportRequestDto } from './dto/report-request.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private promotionsReportService: PromotionsReportService,
    private birthdayReportService: BirthdayReportService,
    private financialAnalyticsService: FinancialAnalyticsService,
    private dailySummaryService: DailySummaryService,
  ) {}

  @Post('send-daily-summary')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async triggerManualDailySummary() {
    await this.dailySummaryService.generateAndSendDailySummary();
    return {
      success: true,
      message: 'Reporte de corte y resumen diario generado y enviado a los destinatarios.',
    };
  }

  @Get('analytics/financial-and-behavior')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getFinancialAndBehaviorAnalytics(
    @Query('range') range?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<FinancialAnalyticsDto> {
    return this.financialAnalyticsService.getFinancialAndBehaviorAnalytics(
      range,
      startDate,
      endDate,
    );
  }

  @Get('sales')
  async getSalesReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupBy') groupBy?: string,
  ): Promise<SalesReportDto> {
    const dto: SalesReportRequestDto = { dateRange: dateRange as any, startDate, endDate, groupBy: groupBy as any };
    return this.reportsService.getSalesReport(dto);
  }

  @Get('memberships')
  async getMembershipReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ): Promise<MembershipReportDto> {
    const dto: MembershipReportRequestDto = { dateRange: dateRange as any, startDate, endDate, status: status as any };
    return this.reportsService.getMembershipReport(dto);
  }

  @Get('payments')
  async getPaymentReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ): Promise<PaymentReportDto> {
    const dto: PaymentReportRequestDto = { dateRange: dateRange as any, startDate, endDate, paymentStatus: paymentStatus as any };
    return this.reportsService.getPaymentReport(dto);
  }

  @Get('revenue')
  async getRevenueReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<RevenueReportDto> {
    const dto: ReportRequestDto = { dateRange: dateRange as any, startDate, endDate };
    return this.reportsService.getRevenueReport(dto);
  }

  @Get('activity')
  async getMemberActivityReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<MemberActivityReportDto> {
    const dto: ReportRequestDto = { dateRange: dateRange as any, startDate, endDate };
    return this.reportsService.getMemberActivityReport(dto);
  }

  @Get('refunds')
  async getRefundAnalysis(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<RefundAnalysisDto> {
    const dto: ReportRequestDto = { dateRange: dateRange as any, startDate, endDate };
    return this.reportsService.getRefundAnalysis(dto);
  }

  @Get('forecast')
  async getForecastReport(): Promise<ForecastReportDto> {
    return this.reportsService.getForecastReport();
  }

  @Get('comprehensive')
  async getComprehensiveReport(
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ComprehensiveReportDto> {
    const dto: ReportRequestDto = { dateRange: dateRange as any, startDate, endDate };
    return this.reportsService.getComprehensiveReport(dto);
  }

  // ========== PROMOTIONS REPORTS ==========

  @Get('promotions')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getPromotionsReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.promotionsReportService.getPromotionsReport(start, end);
  }

  @Get('promotions/summary')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getPromotionsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    return this.promotionsReportService.getDiscountsSummary(start, end);
  }

  @Get('promotions/popularity')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getPromotionsByPopularity() {
    return this.promotionsReportService.getPromotionsByPopularity();
  }

  @Get('promotions/expiring')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getExpiringPromotions(
    @Query('days') days: number = 7,
  ) {
    return this.promotionsReportService.getExpiringPromotions(days);
  }

  @Get('promotions/expired')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getExpiredPromotions() {
    return this.promotionsReportService.getExpiredPromotions();
  }

  // ========== BIRTHDAY REPORTS ==========

  @Get('birthdays/today')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getTodaysBirthdays() {
    return this.birthdayReportService.getTodaysBirthdays();
  }

  @Get('birthdays/upcoming')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getUpcomingBirthdays(
    @Query('days') days: number = 7,
  ) {
    return this.birthdayReportService.getUpcomingBirthdays(days);
  }

  @Get('birthdays/month')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getBirthdaysThisMonth() {
    return this.birthdayReportService.getBirthdaysThisMonth();
  }
}
