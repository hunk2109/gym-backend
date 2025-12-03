import { Controller, Get, Post, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GymSettingsService } from './gym-settings.service';
import { CreateGymSettingsDto, UpdateGymSettingsDto } from './dto/gym-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/gym-settings')
export class GymSettingsController {
  constructor(private readonly gymSettingsService: GymSettingsService) {}

  // Crear configuración del gimnasio - Solo ADMIN
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateGymSettingsDto) {
    return this.gymSettingsService.create(createDto);
  }

  // Ver configuración del gimnasio - Público
  @Get()
  async getSettings() {
    return this.gymSettingsService.getSettings();
  }

  // Actualizar configuración del gimnasio - Solo ADMIN/ENCARGADO
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async update(@Body() updateDto: UpdateGymSettingsDto) {
    return this.gymSettingsService.update(updateDto);
  }
}
