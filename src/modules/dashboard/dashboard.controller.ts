import { Controller, Get, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('members/count')
  @HttpCode(HttpStatus.OK)
  async getMembersCount() {
    return this.dashboardService.getMembersCount();
  }

  @Get('employees/count')
  @HttpCode(HttpStatus.OK)
  async getEmployeesCount() {
    return this.dashboardService.getEmployeesCount();
  }

  @Get('revenue/total')
  @HttpCode(HttpStatus.OK)
  async getTotalRevenue() {
    return this.dashboardService.getTotalRevenue();
  }

  @Get('sales/monthly')
  @HttpCode(HttpStatus.OK)
  async getMonthlySalesStats(
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    return this.dashboardService.getMonthlySalesStats(year, month);
  }

  @Get('sales/quarterly')
  @HttpCode(HttpStatus.OK)
  async getQuarterlySalesStats(
    @Query('year') year?: number,
    @Query('quarter') quarter?: number,
  ) {
    return this.dashboardService.getQuarterlySalesStats(year, quarter);
  }

  @Get('sales/annual')
  @HttpCode(HttpStatus.OK)
  async getAnnualSalesStats(@Query('year') year?: number) {
    return this.dashboardService.getAnnualSalesStats(year);
  }

  @Get('products/top')
  @HttpCode(HttpStatus.OK)
  async getTopProducts(@Query('limit') limit: number = 10) {
    return this.dashboardService.getTopProducts(limit);
  }
}
