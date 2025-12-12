import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto, UpdateMembershipDto, AssignMembershipDto, RenewMembershipDto, sanitizeAssignMembershipDto } from './dto/create-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // Seed endpoint - sin protección para inicializar datos
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedMemberships() {
    console.log('[MembershipsController] Iniciando seed de membresías...');
    const memberships = [
      {
        name: 'Basic',
        description: 'Plan básico de gimnasio',
        price: 29.99,
        durationMonths: 1,
        benefits: ['Acceso a máquinas', 'Horario 6am-10pm'],
        isActive: true,
      },
      {
        name: 'Premium',
        description: 'Plan premium con servicios adicionales',
        price: 59.99,
        durationMonths: 1,
        benefits: ['Acceso a máquinas', 'Clases grupales', 'Entrenador personal 2x/mes', '24/7'],
        isActive: true,
      },
      {
        name: 'VIP',
        description: 'Plan VIP exclusivo',
        price: 99.99,
        durationMonths: 1,
        benefits: ['Todo Premium', 'Entrenador personal ilimitado', 'Nutricionista', 'Spa'],
        isActive: true,
      },
    ];

    const createdMemberships: any[] = [];
    for (const membership of memberships) {
      try {
        const created = await this.membershipsService.createMembership(membership);
        createdMemberships.push(created);
        console.log(`[MembershipsController] Membresía "${created.name}" creada con ID: ${created.id}`);
      } catch (error) {
        console.log(`[MembershipsController] Error creando membresía: ${error.message}`);
      }
    }

    return {
      message: 'Seed completado',
      count: createdMemberships.length,
      memberships: createdMemberships,
    };
  }

  // RUTAS ESPECÍFICAS - Deben ir ANTES de @Post() genérico

  // Sincronizar membresías pendientes con sistema de pagos
  @Post('sync-with-payments')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async syncWithPayments() {
    return this.membershipsService.syncPendingMembershipsToPayments();
  }

  // Membership endpoints - Ver todas las membresías
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getAllMemberships(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const result = await this.membershipsService.getAllMemberships(parseInt(page), parseInt(limit));
    console.log('[MembershipsController] GET /memberships - Retornando:', JSON.stringify(result, null, 2).substring(0, 200));
    return result;
  }

  // Ver membresías activas
  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getActiveMemberships() {
    return this.membershipsService.getActiveMemberships();
  }

  // Ver membresía por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getMembershipById(@Param('id') id: string) {
    return this.membershipsService.getMembershipById(id);
  }

  // Crear membresía
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() createMembershipDto: CreateMembershipDto) {
    console.log('[MembershipsController] POST /memberships - Raw body:', JSON.stringify(createMembershipDto));
    console.log('[MembershipsController] type field value:', createMembershipDto.type);
    console.log('[MembershipsController] type field type:', typeof createMembershipDto.type);
    return this.membershipsService.createMembership(createMembershipDto);
  }

  // Editar membresía
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async updateMembership(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.updateMembership(id, updateMembershipDto);
  }

  // Eliminar membresía - Solo ADMIN
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(@Param('id') id: string) {
    return this.membershipsService.deleteMembership(id);
  }
}

@Controller('member-memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MemberMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // DEPRECATED: Usar /api/member-memberships POST en su lugar
  // Este endpoint ha sido reemplazado por MemberMembershipsController para soportar descuentos
  @Post()
  @HttpCode(HttpStatus.GONE)
  async assignMembership() {
    return {
      statusCode: 410,
      success: false,
      message: 'Este endpoint ha sido deprecado. Por favor usa POST /api/member-memberships en su lugar.',
      error: 'Gone',
    };
  }

  // ======== RUTAS GET/DELETE CON SLUG ESPECÍFICO (ANTES QUE :id) ========

  // Obtener membresías con pago pendiente
  @Get('pending-payments')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getPendingPayments(@Query('daysOverdue') daysOverdue?: string) {
    console.log(`[MemberMembershipsController] GET /pending-payments - daysOverdue=${daysOverdue}`);
    const data = await this.membershipsService.getPendingPayments(daysOverdue ? parseInt(daysOverdue) : undefined);
    console.log(`[MemberMembershipsController] Retornando ${data.length} pagos pendientes`);
    return { data };
  }

  // Verificar expiración de membresías
  @Get('expiry/check')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async checkMembershipExpiry() {
    return this.membershipsService.checkMembershipExpiry();
  }

  // ======== RUTAS CON SLUG 'by-member' (ANTES QUE SLUG GENÉRICO 'member') ========

  // Remover membresía por memberId (la más reciente)
  @Delete('by-member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMembershipByMemberId(@Param('memberId') memberId: string) {
    return this.membershipsService.removeMembershipByMemberId(memberId);
  }

  // ======== RUTAS CON SLUG GENÉRICO (AL FINAL) ========

  // Historial de membresías
  @Get('history/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE)
  @HttpCode(HttpStatus.OK)
  async getMemberMembershipHistory(
    @Param('memberId') memberId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.membershipsService.getMemberMembershipHistory(memberId, parseInt(page), parseInt(limit));
  }

  // Obtener membresía activa del miembro
  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async getMemberActiveMembership(@Param('memberId') memberId: string) {
    return this.membershipsService.getMemberActiveMembership(memberId);
  }

  // ======== RUTAS POST/DELETE CON :id (AL FINAL) ========

  // Renovar membresía
  @Post(':id/renew')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async renewMembership(
    @Param('id') id: string,
    @Body() renewMembershipDto: RenewMembershipDto,
  ) {
    return this.membershipsService.renewMembership(id, renewMembershipDto);
  }

  // Registrar pago de membresía
  @Post(':id/record-payment')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async recordPayment(
    @Param('id') id: string,
    @Body() body: { amountPaid: number; paymentDate: Date },
  ) {
    return this.membershipsService.recordPayment(id, body.amountPaid, body.paymentDate);
  }

  // Remover membresía por ID
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMembership(@Param('id') id: string) {
    return this.membershipsService.removeMembership(id);
  }
}
