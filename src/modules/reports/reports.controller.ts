import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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

@Controller('api/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

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
}
