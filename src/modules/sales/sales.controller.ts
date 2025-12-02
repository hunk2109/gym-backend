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
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@Controller('api/sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  async getAllSales(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.salesService.getAllSales(page, limit);
  }

  @Get('statistics')
  async getSalesStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getSalesStatistics(startDate, endDate);
  }

  @Get('member/:memberId')
  async getSalesByMember(
    @Param('memberId') memberId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.salesService.getSalesByMember(memberId, page, limit);
  }

  @Get('top-products')
  async getTopSellingProducts(@Query('days') days = 30) {
    return this.salesService.getTopSellingProducts(days);
  }

  @Get('daily-revenue')
  async getDailyRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.salesService.getDailyRevenue(startDate, endDate);
  }

  @Get(':id')
  async getSaleById(@Param('id') id: string) {
    return this.salesService.getSaleById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSale(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.createSale(createSaleDto);
  }

  @Put(':id')
  async updateSale(
    @Param('id') id: string,
    @Body() updateSaleDto: UpdateSaleDto,
  ) {
    return this.salesService.updateSale(id, updateSaleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSale(@Param('id') id: string) {
    return this.salesService.deleteSale(id);
  }

  @Get('date-range/:startDate/:endDate')
  async getSalesByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.salesService.getSalesByDateRange(startDate, endDate);
  }
}
