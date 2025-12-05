export class ChartDataDto {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
  }[];
}

export class SalesReportDto {
  totalSales: number;
  totalRevenue: number;
  totalAmount?: number;
  averageSaleValue: number;
  salesCount: number;
  cancelledSales: number;
  cancelledRevenue: number;
  salesNote: string;
  salesTrend: ChartDataDto;
  salesByPeriod?: {
    date: string;
    amount: number;
    count: number;
  }[];
  topProducts: {
    product: string;
    quantity: number;
    revenue: number;
  }[];
  topEmployees: {
    employee: string;
    salesCount: number;
    revenue: number;
  }[];
  periodComparison?: ChartDataDto;
}

export class MembershipReportDto {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  renewalRate: number;
  membershipMix: ChartDataDto;
  membershipGrowth: ChartDataDto;
  membershipsByPeriod?: {
    date: string;
    count: number;
    active: number;
  }[];
  expiryForecast: {
    nextWeek: number;
    nextMonth: number;
    next3Months: number;
  };
  topMemberships: {
    membership: string;
    count: number;
    percentage: number;
  }[];
}

export class PaymentReportDto {
  totalCollected: number;
  totalPending: number;
  totalFailed: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  collectionRate: number;
  paymentMethodBreakdown: ChartDataDto;
  paymentTrend: ChartDataDto;
  paymentsByPeriod?: {
    date: string;
    amount: number;
    count: number;
  }[];
  paymentTypeBreakdown: {
    type: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  topPaymentMethods: {
    method: string;
    count: number;
    amount: number;
  }[];
  overduePayments: {
    total: number;
    amount: number;
    members: number;
  };
}

export class RevenueReportDto {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  revenueSources: ChartDataDto;
  monthlyTrend: ChartDataDto;
  quarterlyComparison: ChartDataDto;
  revenueByPeriod?: {
    date: string;
    amount: number;
  }[];
  yearlyComparison?: ChartDataDto;
  projectedRevenue?: number;
}

export class MemberActivityReportDto {
  totalMembers: number;
  activeMembers: number;
  inactiveMembers: number;
  newMembersThisMonth: number;
  memberActivityChart: ChartDataDto;
  activitiesByPeriod?: {
    date: string;
    count: number;
  }[];
  classAttendanceRate: number;
  classEnrollmentTrend: ChartDataDto;
  topClasses: {
    class: string;
    enrollments: number;
    attendance: number;
  }[];
}

export class RefundAnalysisDto {
  totalRefunds: number;
  totalRefundAmount: number;
  refundRate: number;
  refundsByReason: {
    reason: string;
    count: number;
    amount: number;
  }[];
  refundTrend: ChartDataDto;
  memberRefundFrequency: {
    member: string;
    refunds: number;
    totalAmount: number;
  }[];
}

export class ForecastReportDto {
  nextMonthRevenueForecast: number;
  nextQuarterRevenueForecast: number;
  membershipGrowthForecast: number;
  paymentDefaultRiskForecast: number;
  confidence: string;
  forecastChart: ChartDataDto;
  recommendations: string[];
}

export class ComprehensiveReportDto {
  period: string;
  generatedAt: Date;
  salesReport: SalesReportDto;
  membershipReport: MembershipReportDto;
  paymentReport: PaymentReportDto;
  revenueReport: RevenueReportDto;
  memberActivityReport: MemberActivityReportDto;
  keyMetrics: {
    totalRevenue: number;
    memberCount: number;
    classEnrollments: number;
    collectionRate: number;
  };
  alerts: string[];
}
