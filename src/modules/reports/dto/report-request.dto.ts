export enum DateRange {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export class ReportRequestDto {
  dateRange?: string;
  startDate?: string;
  endDate?: string;
}

export class SalesReportRequestDto extends ReportRequestDto {
  groupBy?: 'day' | 'week' | 'month' | 'product' | 'employee';
}

export class MembershipReportRequestDto extends ReportRequestDto {
  status?: 'active' | 'expired' | 'all';
}

export class PaymentReportRequestDto extends ReportRequestDto {
  paymentStatus?: 'completed' | 'pending' | 'failed' | 'all';
}
