import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MemberMembershipsService } from './member-memberships.service';
import { CreateMemberMembershipDto } from './dto/create-member-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('member-memberships')
@UseGuards(JwtAuthGuard)
export class MemberMembershipsController {
  constructor(
    private readonly memberMembershipsService: MemberMembershipsService,
  ) {}

  /**
   * GET /api/member-memberships/health-check
   * Health check para ver si el servidor tiene los últimos cambios
   */
  @Get('health-check')
  @HttpCode(HttpStatus.OK)
  async healthCheck() {
    return {
      status: 'ok',
      message: 'MemberMembershipsService cargado con cambios de descuento',
      timestamp: new Date(),
      version: '1.1.0-con-descuentos',
    };
  }

  /**
   * GET /api/member-memberships/member/:memberId
   * Obtener la membresía activa de un miembro
   */
  @Get('member/:memberId')
  @HttpCode(HttpStatus.OK)
  async getActiveMembership(@Param('memberId') memberId: string) {
    const memberMembership =
      await this.memberMembershipsService.getMemberActiveMembership(memberId);

    // Asegurar que los decimales se devuelven como números
    if (memberMembership && memberMembership.membership && memberMembership.membership.price) {
      memberMembership.membership.price = parseFloat(memberMembership.membership.price as any);
    }

    return {
      data: memberMembership,
    };
  }

  /**
   * GET /api/member-memberships/history/:memberId
   * Obtener historial de membresías de un miembro
   */
  @Get('history/:memberId')
  @HttpCode(HttpStatus.OK)
  async getMembershipsHistory(@Param('memberId') memberId: string) {
    const memberships =
      await this.memberMembershipsService.getMemberMembershipsHistory(memberId);

    return {
      data: memberships,
    };
  }

  /**
   * GET /api/member-memberships/pending-payments
   * Obtener membresías pendientes de pago
   */
  @Get('pending-payments')
  @HttpCode(HttpStatus.OK)
  async getPendingPayments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.memberMembershipsService.getPendingPayments(
      parseInt(page),
      parseInt(limit),
    );
  }

  /**
   * POST /api/member-memberships
   * Asignar una membresía a un miembro
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assignMembership(
    @Body() dto: CreateMemberMembershipDto,
    @Req() req: any,
  ) {
    console.log('[MemberMembershipsController] Raw body recibido en assignMembership');
    console.log('[MemberMembershipsController] DTO:', JSON.stringify(dto, null, 2));
    console.log('[MemberMembershipsController] DTO keys:', Object.keys(dto));
    console.log('[MemberMembershipsController] memberId:', dto.memberId);
    console.log('[MemberMembershipsController] membershipId:', dto.membershipId);
    console.log('[MemberMembershipsController] startDate:', dto.startDate);
    return this.memberMembershipsService.assignMembership(dto, req.user?.userId);
  }

  /**
   * POST /api/member-memberships/:memberMembershipId/record-payment
   * Registrar un pago para una membresía
   */
  @Post(':memberMembershipId/record-payment')
  @HttpCode(HttpStatus.OK)
  async recordPayment(
    @Param('memberMembershipId') memberMembershipId: string,
    @Body() body: { amountPaid: number; paymentDate?: Date },
  ) {
    const updated = await this.memberMembershipsService.recordPayment(
      memberMembershipId,
      body.amountPaid,
      body.paymentDate,
    );

    return {
      data: updated,
      message: 'Pago registrado exitosamente',
    };
  }

  /**
   * DELETE /api/member-memberships/:memberId
   * Remover la membresía de un miembro
   */
  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMembership(@Param('memberId') memberId: string) {
    await this.memberMembershipsService.removeMembership(memberId);
  }

  /**
   * GET /api/member-memberships
   * Obtener todas las membresías (paginadas)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.memberMembershipsService.findAll(
      parseInt(page),
      parseInt(limit),
    );
  }
}
