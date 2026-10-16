import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { Payment, PaymentStatus } from '../../entities/payment.entity';
import { Payroll, PayrollStatus } from '../../entities/payroll.entity';
import { AccountPayable, AccountPayableStatus } from '../../entities/account-payable.entity';
import { CashRegisterTransaction, CashRegisterTransactionType } from '../../entities/cash-register-transaction.entity';
import { Attendance } from '../../entities/attendance.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';

export interface FinancialAnalyticsDto {
  period: {
    startDate: string;
    endDate: string;
    range: string;
  };
  financial: {
    totalRevenue: number;
    membershipRevenue: number;
    posSalesRevenue: number;
    totalExpenses: number;
    payrollExpenses: number;
    operationalExpenses: number;
    cashWithdrawals: number;
    netProfit: number;
    profitMarginPercent: number;
    payrollRatioPercent: number;
  };
  behavior: {
    totalCheckins: number;
    peakHours: {
      morningCheckins: number; // 06:00 - 11:59
      afternoonCheckins: number; // 12:00 - 17:59
      eveningCheckins: number; // 18:00 - 23:59
      busiestTimeSlot: string;
      busiestPercentage: number;
    };
    weekdays: {
      day: string;
      checkins: number;
    }[];
    membersStats: {
      totalMembers: number;
      activeMembers: number;
      expiredRecentMembers: number;
      retentionRatePercent: number;
      averageRevenuePerActiveMember: number;
    };
  };
  recommendations: {
    id: string;
    category: 'FINANCIAL' | 'OPERATIONS' | 'RETENTION' | 'SALES';
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    actionLabel?: string;
  }[];
}

@Injectable()
export class FinancialAnalyticsService {
  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Payroll)
    private payrollRepository: Repository<Payroll>,
    @InjectRepository(AccountPayable)
    private payableRepository: Repository<AccountPayable>,
    @InjectRepository(CashRegisterTransaction)
    private cashTxRepository: Repository<CashRegisterTransaction>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
  ) {}

  private getDateBounds(range: string = 'monthly', customStart?: string, customEnd?: string) {
    const end = customEnd ? new Date(customEnd) : new Date();
    end.setHours(23, 59, 59, 999);

    const start = customStart ? new Date(customStart) : new Date();
    if (!customStart) {
      start.setHours(0, 0, 0, 0);
      switch (range) {
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
        default:
          start.setMonth(start.getMonth() - 1);
      }
    } else {
      start.setHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  async getFinancialAndBehaviorAnalytics(
    range: string = 'monthly',
    startDate?: string,
    endDate?: string,
  ): Promise<FinancialAnalyticsDto> {
    const { start, end } = this.getDateBounds(range, startDate, endDate);
    
    // Formatear a string MySQL para compatibilidad garantizada
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const startStr = fmt(start);
    const endStr = fmt(end);

    // 1. INGRESOS
    // A) Ventas POS completadas
    const salesRaw = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.createdAt >= :start AND sale.createdAt <= :end', { start: startStr, end: endStr })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();
    const posSalesRevenue = parseFloat(salesRaw?.total || 0);

    // B) Cobro de Membresías
    const paymentsRaw = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where('((payment.paymentDate >= :start AND payment.paymentDate <= :end) OR (payment.createdAt >= :start AND payment.createdAt <= :end))', { start: startStr, end: endStr })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .getRawOne();
    const membershipRevenue = parseFloat(paymentsRaw?.total || 0);

    const totalRevenue = posSalesRevenue + membershipRevenue;

    // 2. GASTOS (Nómina y Operativos)
    // A) Nómina pagada/aprobada
    // Calculamos nómina filtrando por año/mes en el rango
    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1;
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1;

    const payrolls = await this.payrollRepository
      .createQueryBuilder('p')
      .select('SUM(p.totalAmount)', 'total')
      .where('p.status IN (:...statuses)', { statuses: [PayrollStatus.PAID, PayrollStatus.APPROVED] })
      .andWhere(
        '((p.year > :sYear OR (p.year = :sYear AND p.month >= :sMonth)) AND (p.year < :eYear OR (p.year = :eYear AND p.month <= :eMonth)))',
        { sYear: startYear, sMonth: startMonth, eYear: endYear, eMonth: endMonth },
      )
      .getRawOne();
    const payrollExpenses = parseFloat(payrolls?.total || 0);

    // B) Salidas de efectivo / Gastos directos de caja
    // Todo retiro de efectivo (type = 'out') representa un gasto operativo real de gaveta
    const cashWithdrawalsRaw = await this.cashTxRepository
      .createQueryBuilder('tx')
      .select('SUM(tx.amount)', 'total')
      .where('tx.createdAt >= :start AND tx.createdAt <= :end', { start: startStr, end: endStr })
      .andWhere('tx.type = :type', { type: CashRegisterTransactionType.OUT })
      .getRawOne();
    const cashWithdrawals = parseFloat(cashWithdrawalsRaw?.total || 0);

    // C) Cuentas por pagar operativas pagadas por banco/otros métodos (que no sean retiros de caja)
    const payablesRaw = await this.payableRepository
      .createQueryBuilder('ap')
      .select('SUM(ap.amountPaid)', 'total')
      .where('(ap.createdAt >= :start AND ap.createdAt <= :end OR ap.updatedAt >= :start AND ap.updatedAt <= :end)', { start: startStr, end: endStr })
      .andWhere('ap.status = :status', { status: AccountPayableStatus.PAID })
      .andWhere('ap.isCashWithdrawal = :isCash', { isCash: false })
      .getRawOne();
    const operationalExpenses = parseFloat(payablesRaw?.total || 0);

    const totalExpenses = payrollExpenses + operationalExpenses + cashWithdrawals;
    const netProfit = totalRevenue - totalExpenses;
    const profitMarginPercent = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;
    const payrollRatioPercent = totalRevenue > 0 ? Number(((payrollExpenses / totalRevenue) * 100).toFixed(1)) : 0;

    // 3. ANÁLISIS DE COMPORTAMIENTO (ASISTENCIAS & HORAS PICO)
    const attendances = await this.attendanceRepository
      .createQueryBuilder('att')
      .select('att.visitDate', 'visitDate')
      .addSelect('att.createdAt', 'createdAt')
      .where('(att.visitDate >= :start AND att.visitDate <= :end) OR (att.createdAt >= :start AND att.createdAt <= :end)', { start: startStr, end: endStr })
      .getRawMany();

    const totalCheckins = attendances.length;
    let morning = 0; // 06:00 - 11:59
    let afternoon = 0; // 12:00 - 17:59
    let evening = 0; // 18:00 - 23:59

    const weekdayCounts: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    for (const a of attendances) {
      const d = new Date(a.visitDate || a.createdAt);
      const h = d.getHours();
      if (h >= 6 && h < 12) morning++;
      else if (h >= 12 && h < 18) afternoon++;
      else evening++;

      const dayIdx = d.getDay(); // 0 Dom, 1 Lun, ...
      weekdayCounts[dayIdx] = (weekdayCounts[dayIdx] || 0) + 1;
    }

    let busiestTimeSlot = 'Noche (6:00 PM - 11:00 PM)';
    let maxSlotCount = evening;
    if (morning > maxSlotCount) {
      busiestTimeSlot = 'Mañana (6:00 AM - 12:00 PM)';
      maxSlotCount = morning;
    }
    if (afternoon > maxSlotCount) {
      busiestTimeSlot = 'Tarde (12:00 PM - 6:00 PM)';
      maxSlotCount = afternoon;
    }
    const busiestPercentage = totalCheckins > 0 ? Number(((maxSlotCount / totalCheckins) * 100).toFixed(1)) : 0;

    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const weekdays = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
      day: dayNames[idx],
      checkins: weekdayCounts[idx] || 0,
    }));

    // 4. RETENCIÓN Y SOCIOS
    const totalMembers = await this.memberRepository.count();
    const now = new Date();
    const past30Days = new Date(now);
    past30Days.setDate(past30Days.getDate() - 30);

    const activeMembers = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.isActive = :active', { active: true })
      .andWhere('mm.endDate >= :now', { now })
      .select('COUNT(DISTINCT mm.memberId)', 'count')
      .getRawOne()
      .then((r) => parseInt(r?.count || '0'));

    const expiredRecent = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.endDate BETWEEN :past30Days AND :now', { past30Days, now })
      .andWhere('mm.isActive = :inactive', { inactive: false })
      .select('COUNT(DISTINCT mm.memberId)', 'count')
      .getRawOne()
      .then((r) => parseInt(r?.count || '0'));

    const retentionRatePercent = totalMembers > 0 ? Number(((activeMembers / totalMembers) * 100).toFixed(1)) : 0;
    const averageRevenuePerActiveMember = activeMembers > 0 ? Number((totalRevenue / activeMembers).toFixed(2)) : 0;

    // 5. MOTOR DE RECOMENDACIONES BASADO EN DATOS
    const recommendations: FinancialAnalyticsDto['recommendations'] = [];

    // Regla Nómina
    if (payrollRatioPercent > 40) {
      recommendations.push({
        id: 'rec_payroll_high',
        category: 'FINANCIAL',
        priority: 'HIGH',
        title: 'Costo de Nómina Elevado',
        description: `La nómina representa el ${payrollRatioPercent}% de tus ingresos totales (lo ideal es mantenerlo entre 25% y 35%). Evalúa esquemas de comisiones por metas en ventas de membresías o ajustes en horas con baja afluencia.`,
        actionLabel: 'Revisar Nómina',
      });
    } else if (payrollRatioPercent > 0 && payrollRatioPercent <= 35) {
      recommendations.push({
        id: 'rec_payroll_healthy',
        category: 'FINANCIAL',
        priority: 'LOW',
        title: 'Salud Financiera en Nómina',
        description: `Excelente control: la nómina absorbe un saludable ${payrollRatioPercent}% de tus ingresos, garantizando un margen positivo para el negocio.`,
      });
    }

    // Regla Margen Neto
    if (netProfit < 0 && totalRevenue > 0) {
      recommendations.push({
        id: 'rec_negative_margin',
        category: 'FINANCIAL',
        priority: 'HIGH',
        title: 'Margen Operativo Negativo',
        description: `En este período los egresos superaron los ingresos por RD$ ${Math.abs(netProfit).toLocaleString('es-DO', { minimumFractionDigits: 2 })}. Considera lanzar una promoción especial o revisar los gastos operativos en caja.`,
        actionLabel: 'Ver Promociones',
      });
    }

    // Regla Retención / Deserción
    if (expiredRecent > 5) {
      recommendations.push({
        id: 'rec_retention_churn',
        category: 'RETENTION',
        priority: 'HIGH',
        title: `${expiredRecent} Socios en Riesgo de Deserción`,
        description: `Se detectaron ${expiredRecent} socios con membresías vencidas en los últimos 30 días que aún no han renovado. Un mensaje automatizado por WhatsApp con un cupón de reactivación puede recuperar entre un 20% y un 35% de ellos.`,
        actionLabel: 'Enviar Campaña WhatsApp',
      });
    }

    // Regla Horarios Pico
    if (busiestPercentage > 45) {
      recommendations.push({
        id: 'rec_peak_hours',
        category: 'OPERATIONS',
        priority: 'MEDIUM',
        title: `Alta Concentración en ${busiestTimeSlot}`,
        description: `El ${busiestPercentage}% de los check-ins diarios se concentra en este horario. Recomendamos programar al menos 2 entrenadores de sala y un recepcionista de apoyo durante este lapso para mejorar la experiencia del cliente.`,
      });
    }

    // Regla Venta Cruzada (POS vs Membresías)
    const posRatio = totalRevenue > 0 ? (posSalesRevenue / totalRevenue) * 100 : 0;
    if (posRatio < 15 && totalRevenue > 0) {
      recommendations.push({
        id: 'rec_cross_sell',
        category: 'SALES',
        priority: 'MEDIUM',
        title: 'Potencial de Venta Cruzada en Tienda',
        description: `Las ventas de productos y suplementos solo representan el ${posRatio.toFixed(1)}% de la facturación. Los gimnasios de alto rendimiento alcanzan entre 20% y 30% ofreciendo batidos post-entreno, hidratación o indumentaria deportiva.`,
        actionLabel: 'Ver Inventario',
      });
    }

    return {
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        range,
      },
      financial: {
        totalRevenue,
        membershipRevenue,
        posSalesRevenue,
        totalExpenses,
        payrollExpenses,
        operationalExpenses,
        cashWithdrawals,
        netProfit,
        profitMarginPercent,
        payrollRatioPercent,
      },
      behavior: {
        totalCheckins,
        peakHours: {
          morningCheckins: morning,
          afternoonCheckins: afternoon,
          eveningCheckins: evening,
          busiestTimeSlot,
          busiestPercentage,
        },
        weekdays,
        membersStats: {
          totalMembers,
          activeMembers,
          expiredRecentMembers: expiredRecent,
          retentionRatePercent,
          averageRevenuePerActiveMember,
        },
      },
      recommendations,
    };
  }
}
