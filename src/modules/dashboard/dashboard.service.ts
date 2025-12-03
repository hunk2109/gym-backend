import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { Employee } from '../../entities/employee.entity';
import { Member } from '../../entities/member.entity';

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
    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('SUM(sale.totalAmount)', 'total')
      .where('sale.status = :status', { status: SaleStatus.COMPLETED })
      .getRawOne();

    return {
      total: result.total ? parseFloat(result.total) : 0,
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
    // If month is specified, return just that month; otherwise return all 12 months
    const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);
    const results: Array<{
      year: number;
      month: number;
      transactionCount: number;
      totalRevenue: number;
      averageTransaction: number;
      currency: string;
    }> = [];

    for (const m of months) {
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0);

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
        year: y,
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

      results.push({
        year: y,
        quarter: q,
        transactionCount: parseInt(result?.transactionCount || 0),
        totalRevenue: result?.totalRevenue ? parseFloat(result.totalRevenue) : 0,
        currency: 'DOP',
      });
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
}
