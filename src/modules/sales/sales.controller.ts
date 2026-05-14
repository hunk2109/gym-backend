import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Public()
  @Get('health')
  async health() {
    console.log('[SalesController] Health check called');
    return { status: 'ok', message: 'Sales API is running' };
  }

  @Get('debug/today')
  async debugToday() {
    console.log('[SalesController] Debug today endpoint called');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sales = await this.salesService.getSalesByDateRange(
      today.toISOString(),
      tomorrow.toISOString()
    );
    
    console.log(`[SalesController] Found ${sales.length} sales for today`);
    return {
      statusCode: 200,
      success: true,
      data: sales,
      debug: {
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        count: sales.length,
      }
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAllSales(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.salesService.getAllSales(page, limit);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getSalesStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getSalesStatistics(startDate, endDate);
  }

  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getSalesByMember(
    @Param('memberId') memberId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.salesService.getSalesByMember(memberId, page, limit);
  }

  @Get('top-products')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getTopSellingProducts(@Query('days') days = 30) {
    return this.salesService.getTopSellingProducts(days);
  }

  @Get('daily-revenue')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getDailyRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getDailyRevenue(startDate, endDate);
  }

  @Get('date-range/:startDate/:endDate')
  @Public()
  async getSalesByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
    @Query('cashRegisterId') cashRegisterId?: string,
  ) {
    console.log('[SalesController] getSalesByDateRange - Raw startDate:', startDate);
    console.log('[SalesController] getSalesByDateRange - Raw endDate:', endDate);
    console.log('[SalesController] getSalesByDateRange - cashRegisterId:', cashRegisterId);
    
    // Decodificar los parámetros de la URL
    const decodedStartDate = decodeURIComponent(startDate);
    const decodedEndDate = decodeURIComponent(endDate);
    
    console.log('[SalesController] getSalesByDateRange - Decoded startDate:', decodedStartDate);
    console.log('[SalesController] getSalesByDateRange - Decoded endDate:', decodedEndDate);
    
    const result = await this.salesService.getSalesByDateRange(decodedStartDate, decodedEndDate, cashRegisterId);
    console.log('[SalesController] getSalesByDateRange - result length:', result.length);
    console.log('[SalesController] getSalesByDateRange - result statuses:', result.map(r => r.status));
    return { data: result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async createSale(@Request() req: any, @Body() createSaleDto: CreateSaleDto) {
    const userId = req.user.userId;
    return this.salesService.createSale(createSaleDto, userId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async updateSale(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.updateSale(id, updateSaleDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSale(@Param('id') id: string) {
    return this.salesService.deleteSale(id);
  }
}
