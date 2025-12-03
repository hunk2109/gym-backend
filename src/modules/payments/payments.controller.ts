import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { PaymentStatus } from '../../entities/payment.entity';

@Controller('api/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    return this.paymentsService.createPayment(createPaymentDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    return this.paymentsService.getAllPayments(parseInt(page), parseInt(limit));
  }

  @Get('statistics/overview')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getStatistics(): Promise<any> {
    return this.paymentsService.getPaymentStatistics();
  }

  @Get('by-status/:status')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getByStatus(
    @Param('status') status: PaymentStatus,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    return this.paymentsService.getPaymentsByStatus(status, parseInt(page), parseInt(limit));
  }

  @Get('pending-overdue')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getPendingPayments(@Query('daysOverdue') daysOverdue: string = '0'): Promise<any> {
    return this.paymentsService.getPendingPayments(parseInt(daysOverdue));
  }

  @Get('date-range')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Use ISO 8601 format (YYYY-MM-DD)');
    }

    return this.paymentsService.getPaymentsByDateRange(start, end, parseInt(page), parseInt(limit));
  }

  @Get('member/:memberId/history')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  async getMemberHistory(@Param('memberId') memberId: string): Promise<any> {
    return this.paymentsService.getMemberPaymentHistory(memberId);
  }

  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  async getByMember(
    @Param('memberId') memberId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    return this.paymentsService.getPaymentsByMember(memberId, parseInt(page), parseInt(limit));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  async findOne(@Param('id') id: string): Promise<PaymentResponseDto> {
    return this.paymentsService.getPaymentById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.updatePayment(id, updatePaymentDto);
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async refund(
    @Param('id') id: string,
    @Body() body: { refundAmount?: number },
  ): Promise<PaymentResponseDto> {
    return this.paymentsService.recordRefund(id, body.refundAmount);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.paymentsService.deletePayment(id);
  }
}
