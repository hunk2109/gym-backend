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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('api/sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

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

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async createSale(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
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

  @Get('date-range/:startDate/:endDate')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getSalesByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.salesService.getSalesByDateRange(startDate, endDate);
  }
}
