import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Sale } from '../../entities/sale.entity';
import { Employee } from '../../entities/employee.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async getMembersCount(): Promise<{ count: number }> {
    const count = await this.userRepository.count({
      where: { role: UserRole.MEMBER, isActive: true },
    });
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
      .select('SUM(sale.total)', 'total')
      .getRawOne();

    return {
      total: result.total ? parseFloat(result.total) : 0,
      currency: 'DOP',
    };
  }

  async getDashboardStats() {
    const [membersCount, employeesCount, revenue] = await Promise.all([
      this.getMembersCount(),
      this.getEmployeesCount(),
      this.getTotalRevenue(),
    ]);

    return {
      members: membersCount.count,
      employees: employeesCount.count,
      totalRevenue: revenue.total,
      currency: revenue.currency,
      timestamp: new Date().toISOString(),
    };
  }

  async getMonthlySalesStats(year?: number, month?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const m = month || now.getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0);

    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('COUNT(sale.id)', 'transactionCount')
      .addSelect('SUM(sale.total)', 'totalRevenue')
      .addSelect('AVG(sale.total)', 'averageTransaction')
      .where('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    return {
      year: y,
      month: m,
      transactionCount: parseInt(result.transactionCount || 0),
      totalRevenue: result.totalRevenue ? parseFloat(result.totalRevenue) : 0,
      averageTransaction: result.averageTransaction ? parseFloat(result.averageTransaction) : 0,
      currency: 'DOP',
    };
  }

  async getQuarterlySalesStats(year?: number, quarter?: number) {
    const now = new Date();
    const y = year || now.getFullYear();
    const q = quarter || Math.ceil((now.getMonth() + 1) / 3);

    const startMonth = (q - 1) * 3 + 1;
    const startDate = new Date(y, startMonth - 1, 1);
    const endDate = new Date(y, startMonth + 2, 0);

    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('COUNT(sale.id)', 'transactionCount')
      .addSelect('SUM(sale.total)', 'totalRevenue')
      .where('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    return {
      year: y,
      quarter: q,
      transactionCount: parseInt(result.transactionCount || 0),
      totalRevenue: result.totalRevenue ? parseFloat(result.totalRevenue) : 0,
      currency: 'DOP',
    };
  }

  async getAnnualSalesStats(year?: number) {
    const y = year || new Date().getFullYear();
    const startDate = new Date(y, 0, 1);
    const endDate = new Date(y, 11, 31);

    const result = await this.saleRepository
      .createQueryBuilder('sale')
      .select('COUNT(sale.id)', 'transactionCount')
      .addSelect('SUM(sale.total)', 'totalRevenue')
      .where('sale.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .getRawOne();

    return {
      year: y,
      transactionCount: parseInt(result.transactionCount || 0),
      totalRevenue: result.totalRevenue ? parseFloat(result.totalRevenue) : 0,
      currency: 'DOP',
    };
  }

  async getTopProducts(limit: number = 10) {
    // This would require a join with products through sales items
    // For now, returning a placeholder that can be enhanced
    return {
      message: 'Top products requires SaleItem entity relationship',
      limit,
    };
  }
}
