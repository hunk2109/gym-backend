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
import { CreateMembershipDto, UpdateMembershipDto, AssignMembershipDto, RenewMembershipDto } from './dto/create-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // Membership endpoints - Ver todas las membresías
  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async getAllMemberships(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const result = await this.membershipsService.getAllMemberships(parseInt(page), parseInt(limit));
    console.log('[MembershipsController] GET /memberships - Retornando:', JSON.stringify(result, null, 2).substring(0, 200));
    return result;
  }

  // Ver membresías activas
  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
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

@Controller('api/member-memberships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MemberMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // Asignar membresía a miembro
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.CREATED)
  async assignMembership(@Body() assignMembershipDto: AssignMembershipDto) {
    return this.membershipsService.assignMembership(assignMembershipDto);
  }

  // Obtener membresía activa del miembro
  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.CLIENTE, UserRole.EMPLEADO_ENTRENADOR)
  @HttpCode(HttpStatus.OK)
  async getMemberActiveMembership(@Param('memberId') memberId: string) {
    return this.membershipsService.getMemberActiveMembership(memberId);
  }

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

  // Verificar expiración de membresías
  @Get('expiry/check')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.OK)
  async checkMembershipExpiry() {
    return this.membershipsService.checkMembershipExpiry();
  }
}
