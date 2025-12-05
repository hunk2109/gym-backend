import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { Employee } from '../../entities/employee.entity';
import { Member } from '../../entities/member.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Membership } from '../../entities/membership.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
  ) {}

  async getMembersCount(): Promise<{ count: number }> {
    const count = await this.memberRepository.count();
    return { count };
  }

  async getEmployeesCount(): Promise<{ count: number }> {
    const count = await this.employeeRepository.count({
      where: { isActive: true },
    });
    return { count };
  }

  async getTotalRevenue(): Promise<{ total: number; currency: string }> {
    // Ingresos de ventas completadas
    const salesResult = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();

    const salesTotal = salesResult.total ? parseFloat(salesResult.total) : 0;

    // Ingresos de membresías pagadas
    const membershipResult = await this.memberMembershipRepository
      .createQueryBuilder('mm')
      .select('SUM(m.price)', 'total')
      .leftJoin(Membership, 'm', 'm.id = mm.membershipId')
      .where('mm.paymentStatus = :status', { status: 'paid' })
      .getRawOne();

    const membershipTotal = membershipResult.total ? parseFloat(membershipResult.total) : 0;

    return {
      total: salesTotal + membershipTotal,
      currency: 'DOP',
    };
  }

  async getDashboardStats() {
    const [membersCount, employeesCount, revenue, salesCount, topProducts] = await Promise.all([
      this.getMembersCount(),
      this.getEmployeesCount(),
      this.getTotalRevenue(),
      this.saleRepository.count({ where: { status: SaleStatus.COMPLETED } }),
      this.getTopProducts(5),
    ]);

    return {
      totalMembers: membersCount.count,
      totalEmployees: employeesCount.count,
      totalRevenue: revenue.total,
      totalSales: salesCount,
      topProducts: topProducts,
      currency: revenue.currency,
      timestamp: new Date().toISOString(),
    };
  }

  async getMonthlySalesStats(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    
    // If month is specified, return just that month
    if (month) {
      const startDate = new Date(y, month - 1, 1);
      const endDate = new Date(y, month, 0);

      const result = await this.saleRepository
        .createQueryBuilder('sale')
        .select('COUNT(sale.id)', 'transactionCount')
        .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
        .addSelect('AVG(sale.totalAmount)', 'averageTransaction')
        .where('sale.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
        .getRawOne();

      return [{
        year: y,
        month: month,
        transactionCount: parseInt(result?.transactionCount || 0),
        totalRevenue: result?.totalRevenue ? parseFloat(result.totalRevenue) : 0,
        averageTransaction: result?.averageTransaction ? parseFloat(result.averageTransaction) : 0,
        currency: 'DOP',
      }];
    }

    // Return last 6 months instead of all 12
    const results: Array<{
      year: number;
      month: number;
      transactionCount: number;
      totalRevenue: number;
      averageTransaction: number;
      currency: string;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = date.getMonth() + 1;
      const startDate = new Date(date.getFullYear(), m - 1, 1);
      const endDate = new Date(date.getFullYear(), m, 0);

      const result = await this.saleRepository
        .createQueryBuilder('sale')
        .select('COUNT(sale.id)', 'transactionCount')
        .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
        .addSelect('AVG(sale.totalAmount)', 'averageTransaction')
        .where('sale.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
        .getRawOne();

      results.push({
        year: date.getFullYear(),
        month: m,
        transactionCount: parseInt(result?.transactionCount || 0),
        totalRevenue: result?.totalRevenue ? parseFloat(result.totalRevenue) : 0,
        averageTransaction: result?.averageTransaction ? parseFloat(result.averageTransaction) : 0,
        currency: 'DOP',
      });
    }

    return results;
  }

  async getQuarterlySalesStats(year?: number, quarter?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    // If quarter is specified, return just that quarter; otherwise return all 4 quarters
    const quarters = quarter ? [quarter] : [1, 2, 3, 4];
    const results: Array<{
      year: number;
      quarter: number;
      transactionCount: number;
      totalRevenue: number;
      currency: string;
    }> = [];

    for (const q of quarters) {
      const startMonth = (q - 1) * 3 + 1;
      const startDate = new Date(y, startMonth - 1, 1);
      const endDate = new Date(y, startMonth + 2, 0);

      const result = await this.saleRepository
        .createQueryBuilder('sale')
        .select('COUNT(sale.id)', 'transactionCount')
        .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
        .where('sale.createdAt BETWEEN :start AND :end', {
          start: startDate,
          end: endDate,
        })
        .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
        .getRawOne();

      const totalRevenue = result?.totalRevenue ? parseFloat(result.totalRevenue) : 0;
      
      // Filtrar solo trimestres con ingresos > 0
      if (totalRevenue > 0) {
        results.push({
          year: y,
          quarter: q,
          transactionCount: parseInt(result?.transactionCount || 0),
          totalRevenue: totalRevenue,
          currency: 'DOP',
        });
      }
    }

    return results;
  }

  async getAnnualSalesStats(year?: number) {
    const y = year || new Date().getFullYear();
    const startDate = new Date(y, 0, 1);
    const endDate = new Date(y, 11, 31);

    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('COUNT(sale.id)', 'transactionCount')
      .addSelect('SUM(sale.totalAmount)', 'totalRevenue')
      .where('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();

    return {
      year: y,
      transactionCount: parseInt(result.transactionCount || 0),
      totalRevenue: result.totalRevenue ? parseFloat(result.totalRevenue) : 0,
      currency: 'DOP',
    };
  }

  async getSalesRevenue(): Promise<number> {
    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();
    return result.total ? parseFloat(result.total) : 0;
  }

  async getMembershipRevenue(): Promise<number> {
    try {
      const result = await this.memberMembershipRepository.query(`
        SELECT SUM(m.price) as total
        FROM member_memberships mm
        INNER JOIN memberships m ON m.id = mm.membershipId
        WHERE mm.paymentStatus = 'paid'
      `);
      return result[0]?.total ? parseFloat(result[0].total) : 0;
    } catch (error) {
      console.error('[Dashboard] Error en getMembershipRevenue:', error);
      return 0;
    }
  }

  async getMembershipRevenueByType() {
    try {
      console.log('[Dashboard] Iniciando getMembershipRevenueByType');
      const result = await this.memberMembershipRepository.query(`
        SELECT 
          m.name,
          COUNT(mm.id) as count,
          SUM(m.price) as revenue
        FROM member_memberships mm
        INNER JOIN memberships m ON m.id = mm.membershipId
        WHERE mm.paymentStatus = 'paid'
        GROUP BY m.id, m.name
        HAVING SUM(m.price) > 0
        ORDER BY revenue DESC
      `);

      console.log('[Dashboard] Resultado query:', result);
      const mapped = result.map((r: any) => ({
        name: r.name || 'Sin membresía',
        count: parseInt(r.count || 0),
        revenue: parseFloat(r.revenue || 0),
      }));
      console.log('[Dashboard] Mapped result:', mapped);
      return mapped;
    } catch (error) {
      console.error('[Dashboard] Error en getMembershipRevenueByType:', error);
      return [];
    }
  }

  async getTopProducts(limit: number = 10) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const products = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoinAndSelect('sale.items', 'items')
      .innerJoinAndSelect('items.product', 'product')
      .where('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate: startOfMonth,
        endDate: endOfMonth,
      })
      .andWhere('sale.status = :status', { status: SaleStatus.COMPLETED })
      .select('product.id', 'id')
      .addSelect('product.name', 'name')
      .addSelect('SUM(items.quantity)', 'quantity')
      .addSelect('SUM(items.quantity * items.unitPrice)', 'revenue')
      .groupBy('product.id')
      .addGroupBy('product.name')
      .having('SUM(items.quantity * items.unitPrice) > 0')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      quantity: parseInt(p.quantity || '0'),
      revenue: parseFloat(p.revenue || '0'),
    }));
  }

  async getRevenueComparison() {
    try {
      console.log('[Dashboard] Obteniendo comparación de ingresos (membresías vs ventas)');

      // Ingresos de ventas
      const salesResult = await this.saleRepository.query(`
        SELECT SUM(totalAmount) as revenue
        FROM sales
        WHERE status = 'completed'
      `);
      const salesRevenue = salesResult[0]?.revenue ? parseFloat(salesResult[0].revenue) : 0;

      // Ingresos de membresías
      const membershipResult = await this.memberMembershipRepository.query(`
        SELECT SUM(m.price) as revenue
        FROM member_memberships mm
        INNER JOIN memberships m ON m.id = mm.membershipId
        WHERE mm.paymentStatus = 'paid'
      `);
      const membershipRevenue = membershipResult[0]?.revenue ? parseFloat(membershipResult[0].revenue) : 0;

      const total = salesRevenue + membershipRevenue;

      // Filtrar solo ingresos > 0
      const result: Array<{ name: string; revenue: number; percentage: string | number }> = [];
      if (salesRevenue > 0) {
        result.push({
          name: 'Ventas',
          revenue: salesRevenue,
          percentage: total > 0 ? ((salesRevenue / total) * 100).toFixed(2) : 0,
        });
      }
      if (membershipRevenue > 0) {
        result.push({
          name: 'Membresías',
          revenue: membershipRevenue,
          percentage: total > 0 ? ((membershipRevenue / total) * 100).toFixed(2) : 0,
        });
      }

      console.log('[Dashboard] Resultado:', result);
      return result;
    } catch (error) {
      console.error('[Dashboard] Error en getRevenueComparison:', error);
      return [];
    }
  }
}
