import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { GymClass } from '../../entities/gym-class.entity';
import { ClassEnrollment } from '../../entities/class-enrollment.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import {
  SalesReportDto,
  MembershipReportDto,
  PaymentReportDto,
  RevenueReportDto,
  MemberActivityReportDto,
  RefundAnalysisDto,
  ForecastReportDto,
  ComprehensiveReportDto,
  ChartDataDto,
} from './dto/report-response.dto';
import { ReportRequestDto } from './dto/report-request.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(GymClass)
    private classRepository: Repository<GymClass>,
    @InjectRepository(ClassEnrollment)
    private enrollmentRepository: Repository<ClassEnrollment>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
  ) {}

  private getDateRange(dateRange?: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
    const end = endDate ? new Date(endDate) : new Date();
    let start = new Date();

    const range = dateRange || 'monthly';

    switch (range) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'yearly':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(start.getFullYear(), start.getMonth(), 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }

    return { start, end };
  }

  async getSalesReport(dto: ReportRequestDto = {}): Promise<SalesReportDto> {
    const { start, end } = this.getDateRange(dto.dateRange, dto.startDate, dto.endDate);

    const [completedSales, cancelledSales] = await Promise.all([
      this.saleRepository.find({
        where: { createdAt: Between(start, end), status: SaleStatus.COMPLETED },
        relations: ['member', 'items'],
      }),
      this.saleRepository.find({
        where: { createdAt: Between(start, end), status: SaleStatus.CANCELLED },
        relations: ['member', 'items'],
      }),
    ]);

    const totalSales = completedSales.length;
    const totalRevenue = completedSales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    const cancelledCount = cancelledSales.length;
    const cancelledRevenue = cancelledSales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0);
    
    const salesNote = cancelledCount > 0 
      ? `Se encontraron ${cancelledCount} venta${cancelledCount !== 1 ? 's' : ''} anulada${cancelledCount !== 1 ? 's' : ''} en el período de reporte con un monto total de RD$${cancelledRevenue.toFixed(2)}.`
      : 'No hay ventas anuladas en el período de reporte.';

    // Generar desglose por período (día)
    const salesByPeriod = this.generateSalesByPeriod(completedSales, start, end);

    const salesTrend = this.generateBasicChart('Ventas Completadas', [totalSales]);
    const topProducts = await this.getTopProducts(start, end);
    const topEmployees: any[] = [];

    return {
      totalSales,
      totalRevenue,
      totalAmount: totalRevenue,
      averageSaleValue,
      salesCount: totalSales,
      cancelledSales: cancelledCount,
      cancelledRevenue,
      salesNote,
      salesTrend,
      salesByPeriod,
      topProducts,
      topEmployees,
    };
  }

  private generateSalesByPeriod(sales: Sale[], startDate: Date, endDate: Date): any[] {
    const salesByDay: Map<string, { amount: number; count: number }> = new Map();

    // Inicializar todos los días en el rango
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      salesByDay.set(dateKey, { amount: 0, count: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Agrupar ventas por día
    sales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      const existing = salesByDay.get(dateKey) || { amount: 0, count: 0 };
      existing.amount += parseFloat(sale.totalAmount.toString());
      existing.count += 1;
      salesByDay.set(dateKey, existing);
    });

    // Convertir a array
    return Array.from(salesByDay.entries()).map(([date, data]) => ({
      date,
      amount: parseFloat(data.amount.toFixed(2)),
      count: data.count,
    }));
  }

  private generateBasicChart(label: string, data: number[]): ChartDataDto {
    return {
      labels: ['Período'],
      datasets: [
        {
          label,
          data,
          borderColor: '#4CAF50',
          borderWidth: 2,
        },
      ],
    };
  }

  private async getTopProducts(startDate: Date, endDate: Date, limit: number = 5): Promise<any[]> {
    const products = await this.saleItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.sale', 'sale')
      .leftJoinAndSelect('item.product', 'product')
      .where('sale.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .select('product.name', 'name')
      .addSelect('product.id', 'id')
      .addSelect('SUM(item.quantity)', 'quantity')
      .addSelect('SUM(item.quantity * item.unitPrice)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return products.map((p) => ({
      productName: p.name,
      productId: p.id,
      quantity: parseInt(p.quantity || '0'),
      revenue: parseFloat(p.revenue || '0'),
    }));
  }

  async getMembershipReport(dto: ReportRequestDto = {}): Promise<MembershipReportDto> {
    const totalMembers = await this.memberRepository.count();
    const now = new Date();

    const activeResult = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.endDate > :now', { now })
      .andWhere('mm.isActive = true')
      .select('COUNT(DISTINCT mm.memberId)', 'count')
      .getRawOne();

    const activeMembers = parseInt(activeResult?.count || '0');
    const expiredMembers = totalMembers - activeMembers;
    const renewalRate = totalMembers > 0 ? (activeMembers / totalMembers) * 100 : 0;

    const membershipMix = await this.generateMembershipMixChart();
    const membershipGrowth = this.generateBasicChart('Nuevas Membresías', [0]);
    const expiryForecast = await this.generateExpiryForecast();
    const topMemberships = await this.getTopMemberships();
    
    // Generar desglose por período (últimos 30 días)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    const membershipsByPeriod = await this.generateMembershipsByPeriod(startDate, endDate);

    return {
      totalMembers,
      activeMembers,
      expiredMembers,
      renewalRate: parseFloat(renewalRate.toFixed(2)),
      membershipMix,
      membershipGrowth,
      membershipsByPeriod,
      expiryForecast,
      topMemberships,
    };
  }

  private async generateMembershipsByPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    const membershipsByDay: Map<string, { count: number; active: number }> = new Map();

    // Inicializar todos los días en el rango
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      membershipsByDay.set(dateKey, { count: 0, active: 0 });
      current.setDate(current.getDate() + 1);
    }

    // Obtener membresías creadas en el rango
    const memberships = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    // Agrupar por día de creación
    memberships.forEach(membership => {
      const dateKey = membership.createdAt.toISOString().split('T')[0];
      const existing = membershipsByDay.get(dateKey) || { count: 0, active: 0 };
      existing.count += 1;
      if (membership.isActive) {
        existing.active += 1;
      }
      membershipsByDay.set(dateKey, existing);
    });

    // Convertir a array
    return Array.from(membershipsByDay.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      active: data.active,
    }));
  }

  private async generateMembershipMixChart(): Promise<ChartDataDto> {
    const memberships = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.membership', 'membership')
      .select('membership.name', 'name')
      .addSelect('COUNT(mm.id)', 'count')
      .groupBy('membership.id')
      .getRawMany();

    const labels = memberships.map((m) => m.name);
    const data = memberships.map((m) => parseInt(m.count || '0'));
    const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

    return {
      labels,
      datasets: [
        {
          label: 'Distribución de Membresías',
          data,
          backgroundColor: colors.slice(0, labels.length),
        },
      ],
    };
  }

  private async generateExpiryForecast(): Promise<any> {
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const threeMonths = new Date(now);
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    const [weekCount, monthCount, threeMonthsCount] = await Promise.all([
      this.memberMembershipRepository.count({
        where: { endDate: Between(now, nextWeek) },
      }),
      this.memberMembershipRepository.count({
        where: { endDate: Between(now, nextMonth) },
      }),
      this.memberMembershipRepository.count({
        where: { endDate: Between(now, threeMonths) },
      }),
    ]);

    return {
      nextWeek: weekCount,
      nextMonth: monthCount,
      next3Months: threeMonthsCount,
    };
  }

  private async getTopMemberships(limit: number = 5): Promise<any[]> {
    const total = await this.memberMembershipRepository.count();
    const memberships = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .leftJoinAndSelect('mm.membership', 'membership')
      .select('membership.name', 'name')
      .addSelect('COUNT(mm.id)', 'count')
      .groupBy('membership.id')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    return memberships.map((m) => ({
      membership: m.name,
      count: parseInt(m.count || '0'),
      percentage: total > 0 ? parseFloat(((parseInt(m.count || '0') / total) * 100).toFixed(2)) : 0,
    }));
  }

  async getPaymentReport(dto: ReportRequestDto = {}): Promise<PaymentReportDto> {
    try {
      const { start, end } = this.getDateRange(dto.dateRange, dto.startDate, dto.endDate);
      
      console.log(`[ReportsService] getPaymentReport - Consultando pagos entre ${start.toISOString()} y ${end.toISOString()}`);

      const payments = await this.paymentRepository.find({
        where: { paymentDate: Between(start, end) },
      });

      console.log(`[ReportsService] Total de pagos encontrados: ${payments.length}`);
      console.log(`[ReportsService] Pagos por estado:`, {
        COMPLETED: payments.filter(p => p.status === PaymentStatus.COMPLETED).length,
        PENDING: payments.filter(p => p.status === PaymentStatus.PENDING).length,
        FAILED: payments.filter(p => p.status === PaymentStatus.FAILED).length,
      });

      const completed = payments.filter((p) => p.status === PaymentStatus.COMPLETED);
      const pending = payments.filter((p) => p.status === PaymentStatus.PENDING);
      const failed = payments.filter((p) => p.status === PaymentStatus.FAILED);

      const totalCollected = completed.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      const totalPending = pending.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      const totalFailed = failed.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
      const collectionRate = payments.length > 0 ? (completed.length / payments.length) * 100 : 0;

      console.log(`[ReportsService] Totales calculados:`, {
        totalCollected,
        totalPending,
        totalFailed,
        completedCount: completed.length,
        collectionRate,
      });

      const paymentMethodBreakdown = await this.generatePaymentMethodChart(start, end);
      const paymentTrend = this.generateBasicChart('Pagos (RD$)', [totalCollected]);
      const paymentTypeBreakdown = await this.getPaymentTypeBreakdown(start, end);
      const topPaymentMethods = await this.getTopPaymentMethods(start, end);
      const overduePayments = await this.getOverduePayments();
      const paymentsByPeriod = await this.generatePaymentsByPeriod(completed, start, end);

      return {
        totalCollected,
        totalPending,
        totalFailed,
        completedCount: completed.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        collectionRate: parseFloat(collectionRate.toFixed(2)),
        paymentMethodBreakdown,
        paymentTrend,
        paymentsByPeriod,
        paymentTypeBreakdown,
        topPaymentMethods,
        overduePayments,
      };
    } catch (error) {
      console.error('[ReportsService] Error en getPaymentReport:', error);
      throw new Error(`Tipo de dato inválido: ${error.message}`);
    }
  }

  private async generatePaymentsByPeriod(payments: Payment[], startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const paymentsByDay: Map<string, { amount: number; count: number }> = new Map();

      // Inicializar todos los días en el rango
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateKey = current.toISOString().split('T')[0];
        paymentsByDay.set(dateKey, { amount: 0, count: 0 });
        current.setDate(current.getDate() + 1);
      }

      // Agrupar pagos por día
      payments.forEach(payment => {
        try {
          // Convertir a Date si es string
          let paymentDate = payment.paymentDate;
          if (typeof paymentDate === 'string') {
            paymentDate = new Date(paymentDate);
          }
          
          const dateKey = paymentDate instanceof Date 
            ? paymentDate.toISOString().split('T')[0]
            : new Date(paymentDate).toISOString().split('T')[0];
          
          const existing = paymentsByDay.get(dateKey) || { amount: 0, count: 0 };
          existing.amount += parseFloat(payment.amount.toString());
          existing.count += 1;
          paymentsByDay.set(dateKey, existing);
        } catch (err) {
          console.error('[ReportsService] Error procesando payment:', err);
        }
      });

      // Convertir a array
      return Array.from(paymentsByDay.entries()).map(([date, data]) => ({
        date,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count,
      }));
    } catch (error) {
      console.error('[ReportsService] Error en generatePaymentsByPeriod:', error);
      return [];
    }
  }

  private async generatePaymentMethodChart(startDate: Date, endDate: Date): Promise<ChartDataDto> {
    try {
      const methods = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.paymentMethod', 'method')
        .addSelect('COUNT(payment.id)', 'count')
        .addSelect('SUM(CAST(payment.amount as DECIMAL))', 'total')
        .where('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .groupBy('payment.paymentMethod')
        .getRawMany();

      if (!methods || methods.length === 0) {
        return {
          labels: [],
          datasets: [{ label: 'Métodos de Pago', data: [], backgroundColor: [] }],
        };
      }

      const labels = methods
        .map((m) => m.method)
        .filter((m) => m !== null && m !== undefined);
      const data = methods.map((m) => parseInt(m.count || '0'));
      const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];

      return {
        labels,
        datasets: [
          {
            label: 'Métodos de Pago',
            data,
            backgroundColor: colors.slice(0, labels.length),
          },
        ],
      };
    } catch (error) {
      console.error('[ReportsService] Error en generatePaymentMethodChart:', error);
      return {
        labels: [],
        datasets: [{ label: 'Métodos de Pago', data: [], backgroundColor: [] }],
      };
    }
  }

  private async getPaymentTypeBreakdown(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const types = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.paymentType', 'type')
        .addSelect('COUNT(payment.id)', 'count')
        .addSelect('SUM(CAST(payment.amount as DECIMAL))', 'amount')
        .where('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .groupBy('payment.paymentType')
        .getRawMany();

      if (!types || types.length === 0) {
        return [];
      }

      const total = types.reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

      return types
        .filter((t) => t.type !== null && t.type !== undefined)
        .map((t) => ({
          type: t.type,
          count: parseInt(t.count || '0'),
          amount: parseFloat(t.amount || '0'),
          percentage: total > 0 ? parseFloat(((parseFloat(t.amount || '0') / total) * 100).toFixed(2)) : 0,
        }));
    } catch (error) {
      console.error('[ReportsService] Error en getPaymentTypeBreakdown:', error);
      return [];
    }
  }

  private async getTopPaymentMethods(startDate: Date, endDate: Date, limit: number = 5): Promise<any[]> {
    try {
      const methods = await this.paymentRepository
        .createQueryBuilder('payment')
        .select('payment.paymentMethod', 'method')
        .addSelect('COUNT(payment.id)', 'count')
        .addSelect('SUM(CAST(payment.amount as DECIMAL))', 'amount')
        .where('payment.paymentDate >= :startDate', { startDate })
        .andWhere('payment.paymentDate <= :endDate', { endDate })
        .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .groupBy('payment.paymentMethod')
        .orderBy('amount', 'DESC')
        .limit(limit)
        .getRawMany();

      if (!methods || methods.length === 0) {
        return [];
      }

      return methods
        .filter((m) => m.method !== null && m.method !== undefined)
        .map((m) => ({
          method: m.method,
          count: parseInt(m.count || '0'),
          amount: parseFloat(m.amount || '0'),
        }));
    } catch (error) {
      console.error('[ReportsService] Error en getTopPaymentMethods:', error);
      return [];
    }
  }

  private async getOverduePayments(): Promise<any> {
    try {
      const now = new Date();
      const overduePayments = await this.paymentRepository.find({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: LessThan(now),
        },
      });

      if (!overduePayments || overduePayments.length === 0) {
        return {
          total: 0,
          amount: 0,
          members: 0,
        };
      }

      const members = new Set(overduePayments.map((p) => p.memberId).filter((m) => m !== null && m !== undefined));
      const totalAmount = overduePayments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

      return {
        total: overduePayments.length,
        amount: totalAmount,
        members: members.size,
      };
    } catch (error) {
      console.error('[ReportsService] Error en getOverduePayments:', error);
      return {
        total: 0,
        amount: 0,
        members: 0,
      };
    }
  }

  async getRevenueReport(dto: ReportRequestDto = {}): Promise<RevenueReportDto> {
    const { start, end } = this.getDateRange(dto.dateRange, dto.startDate, dto.endDate);

    const sales = await this.saleRepository.find({
      where: { createdAt: Between(start, end), status: SaleStatus.COMPLETED },
    });

    const payments = await this.paymentRepository.find({
      where: { paymentDate: Between(start, end), status: PaymentStatus.COMPLETED },
    });

    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0) +
      payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

    const revenueSources = await this.generateRevenueSourcesChart(start, end);
    const monthlyTrend = this.generateBasicChart('Ingresos Mensuales', [totalRevenue]);
    const quarterlyComparison = this.generateQuarterlyChart();
    const revenueByPeriod = await this.generateRevenueByPeriod(sales, payments, start, end);

    return {
      totalRevenue,
      totalExpenses: 0,
      netIncome: totalRevenue,
      profitMargin: 100,
      revenueSources,
      monthlyTrend,
      quarterlyComparison,
      revenueByPeriod,
      projectedRevenue: this.projectRevenue(totalRevenue),
    };
  }

  private async generateRevenueByPeriod(sales: Sale[], payments: Payment[], startDate: Date, endDate: Date): Promise<any[]> {
    const revenueByDay: Map<string, number> = new Map();

    // Inicializar todos los días en el rango
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      revenueByDay.set(dateKey, 0);
      current.setDate(current.getDate() + 1);
    }

    // Agrupar ventas por día
    sales.forEach(sale => {
      const dateKey = sale.createdAt.toISOString().split('T')[0];
      const existing = revenueByDay.get(dateKey) || 0;
      revenueByDay.set(dateKey, existing + parseFloat(sale.totalAmount.toString()));
    });

    // Agrupar pagos por día
    payments.forEach(payment => {
      const dateKey = payment.paymentDate.toISOString().split('T')[0];
      const existing = revenueByDay.get(dateKey) || 0;
      revenueByDay.set(dateKey, existing + parseFloat(payment.amount.toString()));
    });

    // Convertir a array
    return Array.from(revenueByDay.entries()).map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2)),
    }));
  }

  private async generateRevenueSourcesChart(startDate: Date, endDate: Date): Promise<ChartDataDto> {
    const salesResult = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();

    const paymentsResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.paymentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    return {
      labels: ['Ventas de Productos', 'Pagos de Membresía'],
      datasets: [
        {
          label: 'Ingresos por Fuente',
          data: [
            parseFloat(salesResult?.total || '0'),
            parseFloat(paymentsResult?.total || '0'),
          ],
          backgroundColor: ['#FF6384', '#36A2EB'],
        },
      ],
    };
  }

  private generateQuarterlyChart(): ChartDataDto {
    return {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Ingresos por Trimestre',
          data: [0, 0, 0, 0],
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'],
        },
      ],
    };
  }

  private projectRevenue(currentRevenue: number): number {
    return Math.round(currentRevenue * 1.15);
  }

  async getMemberActivityReport(dto: ReportRequestDto = {}): Promise<MemberActivityReportDto> {
    const totalMembers = await this.memberRepository.count();
    const now = new Date();

    const activeResult = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.endDate > :now', { now })
      .andWhere('mm.isActive = true')
      .select('COUNT(DISTINCT mm.memberId)', 'count')
      .getRawOne();

    const activeMembers = parseInt(activeResult?.count || '0');

    const { start, end } = this.getDateRange(dto.dateRange, dto.startDate, dto.endDate);

    const newMembers = await this.memberRepository.count({
      where: { createdAt: Between(start, end) },
    });

    const memberActivityChart = this.generateBasicChart('Miembros Activos', [activeMembers]);
    const classEnrollmentTrend = await this.generateEnrollmentTrendChart(start, end);
    const topClasses = await this.getTopClasses(start, end);
    const activitiesByPeriod = await this.generateActivitiesByPeriod(start, end);

    return {
      totalMembers,
      activeMembers,
      inactiveMembers: totalMembers - activeMembers,
      newMembersThisMonth: newMembers,
      memberActivityChart,
      activitiesByPeriod,
      classAttendanceRate: 75,
      classEnrollmentTrend,
      topClasses,
    };
  }

  private async generateActivitiesByPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    const activitiesByDay: Map<string, number> = new Map();

    // Inicializar todos los días en el rango
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      activitiesByDay.set(dateKey, 0);
      current.setDate(current.getDate() + 1);
    }

    // Obtener inscripciones en clases en el rango
    const enrollments = await this.enrollmentRepository.find({
      where: { enrollmentDate: Between(startDate, endDate) },
    });

    // Agrupar por día
    enrollments.forEach(enrollment => {
      const dateKey = enrollment.enrollmentDate.toISOString().split('T')[0];
      const existing = activitiesByDay.get(dateKey) || 0;
      activitiesByDay.set(dateKey, existing + 1);
    });

    // Convertir a array
    return Array.from(activitiesByDay.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  }

  private async generateEnrollmentTrendChart(startDate: Date, endDate: Date): Promise<ChartDataDto> {
    const trendResult = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .select('COUNT(enrollment.id)', 'count')
      .where('enrollment.enrollmentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getRawOne();

    return {
      labels: ['Período'],
      datasets: [
        {
          label: 'Inscripciones en Clases',
          data: [parseInt(trendResult?.count || '0')],
          borderColor: '#4CAF50',
          borderWidth: 2,
        },
      ],
    };
  }

  private async getTopClasses(startDate: Date, endDate: Date, limit: number = 5): Promise<any[]> {
    const classes = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.gymClass', 'class')
      .where('enrollment.enrollmentDate BETWEEN :startDate AND :endDate', { startDate, endDate })
      .select('class.name', 'class')
      .addSelect('COUNT(enrollment.id)', 'enrollments')
      .groupBy('class.id')
      .orderBy('enrollments', 'DESC')
      .limit(limit)
      .getRawMany();

    return classes.map((c) => ({
      class: c.class,
      enrollments: parseInt(c.enrollments || '0'),
      attendance: 0,
    }));
  }

  async getRefundAnalysis(dto: ReportRequestDto = {}): Promise<RefundAnalysisDto> {
    const { start, end } = this.getDateRange(dto.dateRange, dto.startDate, dto.endDate);

    const refunds = await this.paymentRepository.find({
      where: {
        status: PaymentStatus.REFUNDED,
        paymentDate: Between(start, end),
      },
    });

    const totalRefunds = refunds.length;
    const totalRefundAmount = refunds.reduce((sum, r) => sum + parseFloat(r.amount.toString()), 0);
    const allPayments = await this.paymentRepository.count({
      where: { paymentDate: Between(start, end) },
    });

    const refundRate = allPayments > 0 ? (totalRefunds / allPayments) * 100 : 0;
    const refundTrend = this.generateBasicChart('Reembolsos (RD$)', [totalRefundAmount]);

    return {
      totalRefunds,
      totalRefundAmount,
      refundRate: parseFloat(refundRate.toFixed(2)),
      refundsByReason: [],
      refundTrend,
      memberRefundFrequency: [],
    };
  }

  async getForecastReport(): Promise<ForecastReportDto> {
    const lastMonthRevenue = await this.getLastMonthRevenue();
    const membershipGrowthRate = await this.getMembershipGrowthRate();

    const nextMonthForecast = lastMonthRevenue * (1 + membershipGrowthRate / 100);
    const nextQuarterForecast = nextMonthForecast * 3 * 1.05;

    const forecastChart = this.generateBasicForecastChart();
    const recommendations = this.generateRecommendations(nextMonthForecast, membershipGrowthRate);

    return {
      nextMonthRevenueForecast: Math.round(nextMonthForecast),
      nextQuarterRevenueForecast: Math.round(nextQuarterForecast),
      membershipGrowthForecast: parseFloat(membershipGrowthRate.toFixed(2)),
      paymentDefaultRiskForecast: 5.2,
      confidence: 'MEDIUM',
      forecastChart,
      recommendations,
    };
  }

  private async getLastMonthRevenue(): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const start = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const end = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    const salesResult = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.createdAt BETWEEN :start AND :end', { start, end })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();

    const paymentsResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('payment.paymentDate BETWEEN :start AND :end', { start, end })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();

    return (parseFloat(salesResult?.total || '0') || 0) + (parseFloat(paymentsResult?.total || '0') || 0);
  }

  private async getMembershipGrowthRate(): Promise<number> {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const thisMonthCount = await this.memberRepository.count({
      where: { createdAt: MoreThan(lastMonth) },
    });
    const lastMonthCount = await this.memberRepository.count({
      where: {
        createdAt: Between(twoMonthsAgo, lastMonth),
      },
    });

    return lastMonthCount > 0 ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100 : 0;
  }

  private generateBasicForecastChart(): ChartDataDto {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
    const forecast = [45000, 48000, 52000, 55000, 58000, 62000];

    return {
      labels: months,
      datasets: [
        {
          label: 'Pronóstico de Ingresos',
          data: forecast,
          borderColor: '#9966FF',
          borderWidth: 2,
        },
      ],
    };
  }

  private generateRecommendations(forecast: number, growthRate: number): string[] {
    const recommendations: string[] = [];

    if (forecast > 100000) {
      recommendations.push('Considere expandir la capacidad de membresías debido al fuerte crecimiento proyectado');
    }

    if (growthRate > 10) {
      recommendations.push('Mantener el ritmo de adquisición de nuevos miembros - el crecimiento es sólido');
    }

    if (growthRate < 5) {
      recommendations.push('Implementar estrategias de marketing para acelerar el crecimiento de membresías');
    }

    recommendations.push('Revisar periódicamente los precios de membresías');
    recommendations.push('Enfocarse en mejorar la tasa de retención de miembros');

    return recommendations;
  }

  async getComprehensiveReport(dto: ReportRequestDto = {}): Promise<ComprehensiveReportDto> {
    const [sales, membership, payment, revenue, activity, forecast] = await Promise.all([
      this.getSalesReport(dto),
      this.getMembershipReport(dto),
      this.getPaymentReport(dto),
      this.getRevenueReport(dto),
      this.getMemberActivityReport(dto),
      this.getForecastReport(),
    ]);

    const alerts = this.generateAlerts(payment, membership);

    return {
      period: dto.dateRange || 'monthly',
      generatedAt: new Date(),
      salesReport: sales,
      membershipReport: membership,
      paymentReport: payment,
      revenueReport: revenue,
      memberActivityReport: activity,
      keyMetrics: {
        totalRevenue: revenue.totalRevenue,
        memberCount: membership.totalMembers,
        classEnrollments: 0,
        collectionRate: payment.collectionRate,
      },
      alerts,
    };
  }

  private generateAlerts(payment: PaymentReportDto, membership: MembershipReportDto): string[] {
    const alerts: string[] = [];

    if (payment.collectionRate < 80) {
      alerts.push(`⚠️ Tasa de cobranza baja (${payment.collectionRate}%). Revisar pagos pendientes.`);
    }

    if (payment.overduePayments.total > 10) {
      alerts.push(`⚠️ ${payment.overduePayments.total} pagos vencidos. Tomar acciones de cobranza.`);
    }

    if (membership.renewalRate < 70) {
      alerts.push(`⚠️ Tasa de renovación baja (${membership.renewalRate}%). Implementar estrategias de retención.`);
    }

    if (membership.expiryForecast.nextWeek > 50) {
      alerts.push(`ℹ️ ${membership.expiryForecast.nextWeek} membresías expiran en la próxima semana.`);
    }

    return alerts;
  }
}
