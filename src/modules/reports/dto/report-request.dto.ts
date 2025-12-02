import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum DateRange {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export class ReportRequestDto {
  @IsOptional()
  @IsEnum(DateRange)
  dateRange?: DateRange = DateRange.MONTHLY;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SalesReportRequestDto extends ReportRequestDto {
  @IsOptional()
  groupBy?: 'day' | 'week' | 'month' | 'product' | 'employee';
}

export class MembershipReportRequestDto extends ReportRequestDto {
  @IsOptional()
  status?: 'active' | 'expired' | 'all';
}

export class PaymentReportRequestDto extends ReportRequestDto {
  @IsOptional()
  paymentStatus?: 'completed' | 'pending' | 'failed' | 'all';
}
