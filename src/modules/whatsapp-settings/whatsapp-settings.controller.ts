import { Controller, Get, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('whatsapp-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhatsappSettingsController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('logout')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.whatsappService.logout();
    return {
      success: true,
      message: 'Sesión de WhatsApp cerrada exitosamente',
    };
  }
  
  @Post('restart')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async restart() {
    await this.whatsappService.restartClient();
    return {
      success: true,
      message: 'Cliente de WhatsApp reiniciando...',
    };
  }

  @Post('test-message')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  @HttpCode(HttpStatus.OK)
  async sendTestMessage(@Body() body: { phoneNumber: string; message?: string }) {
    if (!body.phoneNumber) {
      return {
        success: false,
        error: 'Número de teléfono es requerido',
      };
    }
    
    try {
      const text = body.message || 'Este es un mensaje de prueba del sistema Gym Manager.';
      await this.whatsappService.sendMessage(body.phoneNumber, text);
      return {
        success: true,
        message: 'Mensaje de prueba enviado exitosamente',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error enviando mensaje de prueba',
      };
    }
  }
}
