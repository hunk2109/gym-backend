import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Patch, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, PaymentResponseDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { PaymentStatus } from '../../entities/payment.entity';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any): Promise<PaymentResponseDto> {
    const userId = req.user?.userId;
    console.log(`[PAYMENTS_CONTROLLER] req.user:`, JSON.stringify(req.user, null, 2));
    console.log(`[PAYMENTS_CONTROLLER] userId extraído:`, userId);
    const result = await this.paymentsService.createPayment(createPaymentDto, userId);
    console.log(`[PAYMENTS_CONTROLLER] Payment guardado con createdBy:`, result.createdBy);
    return result;
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<any> {
    return this.paymentsService.getAllPayments(parseInt(page), parseInt(limit));
  }

  @Get('all')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAllPaymentsWithoutPagination(): Promise<any> {
    console.log('[PaymentsController] GET /all - Obteniendo todos los pagos');
    const payments = await this.paymentsService.getAllPaymentsWithoutPagination();
    console.log(`[PaymentsController] Total de pagos: ${payments.length}`);
    return {
      data: payments,
      total: payments.length,
    };
  }

  @Get('statistics/overview')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getStatistics(): Promise<any> {
    return this.paymentsService.getPaymentStatistics();
  }

  @Get('diagnosis/completed-registrations')
  @Roles(UserRole.ADMIN)
  async diagnosisCompletedRegistrations(): Promise<any> {
    return this.paymentsService.diagnosisGetCompletedRegistrationPayments();
  }

  @Get('pending-all')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAllPendingPayments(): Promise<any> {
    console.log('[PaymentsController] GET /pending-all - Obteniendo todos los pagos pendientes');
    const payments = await this.paymentsService.getAllPendingPayments();
    console.log(`[PaymentsController] Total de pagos pendientes: ${payments.length}`);
    return {
      data: payments,
      total: payments.length,
    };
  }

  @Post(':id/pay')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async payPayment(
    @Param('id') paymentId: string,
    @Body() body: { paymentMethod?: string },
    @Req() req: any,
  ): Promise<any> {
    const userId = req.user?.userId;
    console.log(`[PAYMENTS_CONTROLLER] POST /payments/:id/pay - paymentId: ${paymentId}, paymentMethod: ${body.paymentMethod || 'cash'}`);
    return this.paymentsService.payPayment(paymentId, body.paymentMethod || 'cash', userId);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ): Promise<PaymentResponseDto> {
    const userId = req.user?.userId;
    console.log(`[PAYMENTS_CONTROLLER] PATCH /payments/:id/status - userId extraído:`, userId);
    // Usar fecha actual si no se proporciona
    const paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();
    return this.paymentsService.updatePaymentStatus(id, body.status, paymentDate, userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.paymentsService.deletePayment(id);
  }
}
