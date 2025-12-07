import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
} from './dto/create-equipment.dto';
import { EquipmentService } from './equipment.service';

@Controller('equipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  // Ver todo el equipo
  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  async getAllEquipment(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.equipmentService.getAllEquipment(page, limit);
  }

  // Ver equipo por categoría
  @Get('category/:category')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  async getEquipmentByCategory(@Param('category') category: string) {
    return this.equipmentService.getEquipmentByCategory(category);
  }

  // Ver equipo por ubicación
  @Get('location/:location')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  async getEquipmentByLocation(@Param('location') location: string) {
    return this.equipmentService.getEquipmentByLocation(location);
  }

  // Ver equipo que necesita mantenimiento - Solo ADMIN/ENCARGADO
  @Get('maintenance-needed')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getEquipmentNeedingMaintenance() {
    return this.equipmentService.getEquipmentNeedingMaintenance();
  }

  // Buscar equipo
  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  async searchEquipment(@Query('query') query: string) {
    return this.equipmentService.searchEquipment(query);
  }

  // Ver estado general del equipo - Solo ADMIN/ENCARGADO
  @Get('status/overview')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getEquipmentStatus() {
    return this.equipmentService.getEquipmentStatus();
  }

  // Ver equipo por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_ENTRENADOR)
  async getEquipmentById(@Param('id') id: string) {
    return this.equipmentService.getEquipmentById(id);
  }

  // Crear equipo - Solo ADMIN/ENCARGADO
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.CREATED)
  async createEquipment(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.createEquipment(createEquipmentDto);
  }

  // Editar equipo - Solo ADMIN/ENCARGADO
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateEquipment(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.updateEquipment(id, updateEquipmentDto);
  }

  // Actualizar estado del equipo - Solo ADMIN/ENCARGADO
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateEquipmentStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateEquipmentStatusDto,
  ) {
    return this.equipmentService.updateEquipmentStatus(id, updateStatusDto);
  }

  // Actualizar fecha de mantenimiento - Solo ADMIN/ENCARGADO
  @Patch(':id/maintenance')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateMaintenanceDate(
    @Param('id') id: string,
    @Body('nextMaintenanceDate') nextMaintenanceDate: string,
  ) {
    return this.equipmentService.updateMaintenanceDate(
      id,
      new Date(nextMaintenanceDate),
    );
  }

  // Eliminar equipo - Solo ADMIN
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEquipment(@Param('id') id: string) {
    return this.equipmentService.deleteEquipment(id);
  }
}
