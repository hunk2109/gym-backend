import { Controller, Get, Post, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GymSettingsService } from './gym-settings.service';
import { CreateGymSettingsDto, UpdateGymSettingsDto } from './dto/gym-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('gym-settings')
export class GymSettingsController {
  constructor(private readonly gymSettingsService: GymSettingsService) {}

  // Crear configuración del gimnasio - Solo ADMIN
  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateGymSettingsDto) {
    const settings = await this.gymSettingsService.create(createDto);
    return {
      success: true,
      data: settings,
    };
  }

  // Ver configuración del gimnasio - Público
  @Get()
  async getSettings() {
    const settings = await this.gymSettingsService.getSettings();
    
    // Asegurar que logoImage es base64 string
    const response = { ...settings } as any;
    if (response.logoImage && typeof response.logoImage === 'object') {
      try {
        response.logoImage = response.logoImage.toString('base64');
      } catch (error) {
        // Si falla, eliminar la imagen
        delete response.logoImage;
      }
    }
    
    return {
      success: true,
      data: response,
    };
  }

  // Actualizar configuración del gimnasio - Solo ADMIN/ENCARGADO
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async update(@Body() updateDto: UpdateGymSettingsDto) {
    const settings = await this.gymSettingsService.update(updateDto);
    
    // Asegurar que logoImage es base64 string
    const response = { ...settings } as any;
    if (response.logoImage && typeof response.logoImage === 'object') {
      try {
        response.logoImage = response.logoImage.toString('base64');
      } catch (error) {
        // Si falla, eliminar la imagen
        delete response.logoImage;
      }
    }
    
    return {
      success: true,
      data: response,
    };
  }
}
