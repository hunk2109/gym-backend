import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { MB360DeviceService } from './services/mb360-device.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { MB360ResponseDto } from './dto/mb360-device.dto';

@Controller('mb360')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ENCARGADO)
export class MB360Controller {
  constructor(private readonly mb360DeviceService: MB360DeviceService) {}

  /**
   * Prueba la conexión con el dispositivo MB360
   */
  @Post('test-connection/:gymSettingsId')
  @HttpCode(HttpStatus.OK)
  async testConnection(@Param('gymSettingsId') gymSettingsId: string): Promise<MB360ResponseDto> {
    if (!gymSettingsId) {
      throw new BadRequestException('gymSettingsId es requerido');
    }
    return this.mb360DeviceService.testConnection(gymSettingsId);
  }

  /**
   * Obtiene información del dispositivo
   */
  @Get('device-info/:gymSettingsId')
  async getDeviceInfo(@Param('gymSettingsId') gymSettingsId: string): Promise<MB360ResponseDto> {
    if (!gymSettingsId) {
      throw new BadRequestException('gymSettingsId es requerido');
    }
    return this.mb360DeviceService.getDeviceInfo(gymSettingsId);
  }

  /**
   * Abre la puerta (activa relé)
   */
  @Post('unlock-door/:gymSettingsId')
  @HttpCode(HttpStatus.OK)
  async unlockDoor(@Param('gymSettingsId') gymSettingsId: string): Promise<MB360ResponseDto> {
    if (!gymSettingsId) {
      throw new BadRequestException('gymSettingsId es requerido');
    }
    return this.mb360DeviceService.unlockDoor(gymSettingsId);
  }

  /**
   * Obtiene últimos intentos de acceso
   */
  @Get('access-attempts/:gymSettingsId')
  async getAccessAttempts(
    @Param('gymSettingsId') gymSettingsId: string,
  ): Promise<MB360ResponseDto> {
    if (!gymSettingsId) {
      throw new BadRequestException('gymSettingsId es requerido');
    }
    return this.mb360DeviceService.getRecentAccessAttempts(
      gymSettingsId,
      50,
    );
  }

  /**
   * Obtiene estadísticas de acceso del día
   */
  @Get('today-stats/:gymSettingsId')
  async getTodayStats(@Param('gymSettingsId') gymSettingsId: string): Promise<MB360ResponseDto> {
    if (!gymSettingsId) {
      throw new BadRequestException('gymSettingsId es requerido');
    }
    return this.mb360DeviceService.getTodayStats(gymSettingsId);
  }
}
