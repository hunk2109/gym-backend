import { Controller, Post, Get, Put, Body, Logger, HttpCode, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SyncService } from './sync.service';
import { ConfigService } from './config.service';
import { AccessService } from './access.service';
import { ZktecoDeviceService } from './zkteco-device.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
    private readonly accessService: AccessService,
    private readonly zktecoDeviceService: ZktecoDeviceService,
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
   * GET /api/sync/access-dashboard
   * Obtiene datos principales de ZKAccess/Access para la pantalla de control
   */
  @Get('access-dashboard')
  @Public()
  async getAccessDashboard(@Query('limit') limit?: string) {
    try {
      return await this.accessService.getAccessDashboard(Number(limit) || 30);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error obteniendo datos de Access',
      };
    }
  }

  /**
   * POST /api/sync/access-machine/test
   * Prueba conectividad TCP al equipo configurado en la tabla machine
   */
  @Post('access-machine/test')
  @Public()
  @HttpCode(200)
  async testAccessMachineConnection(@Body() body: { machineId?: number }) {
    try {
      return await this.accessService.testAccessMachineConnection(body?.machineId);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo conectar al equipo',
      };
    }
  }

  /**
   * POST /api/sync/zk-device/test
   * Prueba conexion real al equipo ZKTeco usando protocolo de dispositivo
   */
  @Post('zk-device/test')
  @Public()
  @HttpCode(200)
  async testZktecoDevice(): Promise<any> {
    try {
      return await this.zktecoDeviceService.testConnection();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo conectar al equipo ZKTeco',
      };
    }
  }

  /**
   * GET /api/sync/zk-device/users
   * Lee usuarios directamente desde el equipo ZKTeco
   */
  @Get('zk-device/users')
  @Public()
  async getZktecoDeviceUsers(): Promise<any> {
    try {
      return await this.zktecoDeviceService.getUsers();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudieron leer usuarios del equipo ZKTeco',
      };
    }
  }

  /**
   * POST /api/sync/zk-device/push-active-users
   * Envia miembros/empleados activos al equipo ZKTeco sin tocar huellas
   */
  @Post('zk-device/push-active-users')
  @Public()
  @HttpCode(200)
  async pushActiveUsersToZktecoDevice(): Promise<any> {
    try {
      return await this.zktecoDeviceService.pushActiveUsers();
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudieron enviar usuarios al equipo ZKTeco',
      };
    }
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

  /**
   * GET /api/sync/explore
   * Explora el disco del servidor para seleccionar base de datos Access
   */
  @Get('explore')
  @Public()
  async exploreFiles(@Query('dir') dir?: string) {
    try {
      // Si no hay directorio, mostrar unidades en Windows
      if (!dir || dir === '') {
        const isWin = process.platform === 'win32';
        if (isWin) {
          // En Node no hay forma nativa sencilla de listar discos sin wmic/fs, usamos algunos comunes o C:\
          return {
            success: true,
            currentPath: '',
            items: [
              { name: 'C:\\', path: 'C:\\', isDirectory: true },
              { name: 'D:\\', path: 'D:\\', isDirectory: true }
            ]
          };
        }
        dir = '/';
      }

      // Normalizar la ruta
      const targetDir = path.normalize(dir);
      
      if (!fs.existsSync(targetDir)) {
        return { success: false, error: 'Directorio no encontrado' };
      }

      const files = fs.readdirSync(targetDir, { withFileTypes: true });
      const items = files
        .map(dirent => {
          try {
            return {
              name: dirent.name,
              path: path.join(targetDir, dirent.name),
              isDirectory: dirent.isDirectory(),
            };
          } catch (e) {
            return null; // Skip if permission denied or other error
          }
        })
        .filter(item => item !== null)
        .filter(item => {
          // Filtrar: solo mostrar carpetas y archivos .mdb / .accdb / .txt
          if (item!.isDirectory) return true;
          const ext = path.extname(item!.name).toLowerCase();
          return ext === '.mdb' || ext === '.accdb';
        })
        .sort((a, b) => {
          // Carpetas primero
          if (a!.isDirectory && !b!.isDirectory) return -1;
          if (!a!.isDirectory && b!.isDirectory) return 1;
          return a!.name.localeCompare(b!.name);
        });

      return {
        success: true,
        currentPath: targetDir,
        parentPath: path.dirname(targetDir) !== targetDir ? path.dirname(targetDir) : '',
        items,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error leyendo el directorio',
      };
    }
  }
}
