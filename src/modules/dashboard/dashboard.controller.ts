import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('members/count')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getMembersCount() {
    return this.dashboardService.getMembersCount();
  }

  @Get('employees/count')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getEmployeesCount() {
    return this.dashboardService.getEmployeesCount();
  }

  @Get('revenue/total')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getTotalRevenue() {
    return this.dashboardService.getTotalRevenue();
  }

  @Get('sales/monthly')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getMonthlySalesStats(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.dashboardService.getMonthlySalesStats(year, month);
  }

  @Get('sales/quarterly')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getQuarterlySalesStats(
    @Query('year') year?: number,
    @Query('quarter') quarter?: number,
  ) {
    return this.dashboardService.getQuarterlySalesStats(year, quarter);
  }

  @Get('sales/annual')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getAnnualSalesStats(@Query('year') year?: number) {
    return this.dashboardService.getAnnualSalesStats(year);
  }

  @Get('products/top')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getTopProducts(@Query('limit') limit: number = 10) {
    return this.dashboardService.getTopProducts(limit);
  }

  @Get('revenue/sales')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getSalesRevenue() {
    return {
      total: await this.dashboardService.getSalesRevenue(),
      currency: 'DOP',
    };
  }

  @Get('revenue/memberships')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getMembershipRevenue() {
    return {
      total: await this.dashboardService.getMembershipRevenue(),
      currency: 'DOP',
    };
  }

  @Get('revenue/memberships-by-type')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getMembershipRevenueByType() {
    console.log('[DashboardController] getMembershipRevenueByType endpoint llamado');
    const data = await this.dashboardService.getMembershipRevenueByType();
    console.log('[DashboardController] Devolviendo data:', data);
    return {
      data: data,
    };
  }

  @Get('revenue/comparison')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getRevenueComparison() {
    console.log('[DashboardController] getRevenueComparison endpoint llamado');
    const data = await this.dashboardService.getRevenueComparison();
    console.log('[DashboardController] Comparación de ingresos:', data);
    return {
      data: data,
    };
  }

  @Get('payments/pending')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async getPendingPayments() {
    console.log('[DashboardController] getPendingPayments endpoint llamado');
    const data = await this.dashboardService.getPendingPaymentsCount();
    console.log('[DashboardController] Pagos pendientes:', data);
    return data;
  }
}
