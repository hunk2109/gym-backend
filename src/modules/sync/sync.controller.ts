import { Controller, Post, Get, Put, Body, Logger, HttpCode } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SyncService } from './sync.service';
import { ConfigService } from './config.service';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /api/sync/initial
   * Realiza sincronización inicial de Access a MySQL
   */
  @Post('initial')
  @Public()
  @HttpCode(200)
  async performInitialSync() {
    this.logger.log('Endpoint: Sincronización inicial solicitada');
    try {
      return await this.syncService.performInitialSync();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error durante la sincronización',
      };
    }
  }

  /**
   * POST /api/sync/enable-auto
   * Habilita sincronización automática
   */
  @Post('enable-auto')
  @Public()
  @HttpCode(200)
  enableAutoSync() {
    this.logger.log('Endpoint: Sincronización automática habilitada');
    return this.syncService.enableAutoSync();
  }

  /**
   * POST /api/sync/disable-auto
   * Desactiva sincronización automática
   */
  @Post('disable-auto')
  @Public()
  @HttpCode(200)
  disableAutoSync() {
    this.logger.log('Endpoint: Sincronización automática deshabilitada');
    return this.syncService.disableAutoSync();
  }

  /**
   * GET /api/sync/status
   * Obtiene estado de sincronización
   */
  @Get('status')
  @Public()
  getSyncStatus() {
    return this.syncService.getSyncStatus();
  }

  /**
   * PUT /api/sync/access-path
   * Establece la ruta de la base de datos Access (guarda en MySQL)
   */
  @Put('access-path')
  @Public()
  @HttpCode(200)
  async setAccessDbPath(@Body() body: { path: string }) {
    this.logger.log(`Endpoint: Ruta de Access establecida: ${body.path}`);
    try {
      await this.configService.setConfig(
        'ACCESS_DB_PATH',
        body.path,
        'Ruta de la base de datos Access'
      );
      await this.syncService.setAccessDbPath(body.path);
      return {
        success: true,
        message: 'Ruta de Access guardada correctamente',
        path: body.path,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error guardando la ruta',
      };
    }
  }

  /**
   * GET /api/sync/access-path
   * Obtiene la ruta guardada de la base de datos Access
   */
  @Get('access-path')
  @Public()
  async getAccessDbPath() {
    try {
      const path = await this.configService.getConfig('ACCESS_DB_PATH');
      return {
        success: true,
        path: path || null,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error obteniendo la ruta',
      };
    }
  }
}
