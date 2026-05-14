import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccessService } from './access.service';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private isSyncEnabled = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastSyncTime: Date | null = null;

  constructor(private readonly accessService: AccessService) {}

  /**
   * Realiza una sincronización inicial
   */
  async performInitialSync(): Promise<any> {
    this.logger.log('Iniciando sincronización inicial...');
    try {
      const result = await this.accessService.syncAll();
      this.lastSyncTime = new Date();
      return {
        success: true,
        message: 'Sincronización inicial completada',
        data: result,
      };
    } catch (error) {
      this.logger.error(`Error en sincronización inicial: ${error}`);
      throw error;
    }
  }

  /**
   * Activa la sincronización automática cada 5 minutos
   */
  enableAutoSync(): { status: string; interval: string } {
    if (this.isSyncEnabled) {
      return { status: 'Ya está habilitada', interval: '5 minutos' };
    }

    this.isSyncEnabled = true;
    this.logger.log('Sincronización automática habilitada');

    // Ejecutar la primera sincronización inmediatamente
    this.accessService.syncAll().catch((error) => {
      this.logger.error(`Error en sync automático: ${error}`);
    });

    // Luego ejecutar cada 5 minutos
    this.syncInterval = setInterval(() => {
      this.logger.log('Ejecutando sincronización automática...');
      this.accessService.syncAll().catch((error) => {
        this.logger.error(`Error en sync automático: ${error}`);
      });
    }, 5 * 60 * 1000); // 5 minutos

    return {
      status: 'Sincronización automática habilitada',
      interval: '5 minutos',
    };
  }

  /**
   * Desactiva la sincronización automática
   */
  disableAutoSync(): { status: string } {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isSyncEnabled = false;
      this.logger.log('Sincronización automática deshabilitada');
      return { status: 'Sincronización automática deshabilitada' };
    }

    return { status: 'La sincronización automática no estaba activa' };
  }

  /**
   * Obtiene el estado de la sincronización automática
   */
  getSyncStatus(): {
    isEnabled: boolean;
    lastSyncTime: Date | null;
    interval: string;
  } {
    return {
      isEnabled: this.isSyncEnabled,
      lastSyncTime: this.lastSyncTime,
      interval: '5 minutos',
    };
  }

  /**
   * Establece la ruta de la base de datos Access
   */
  async setAccessDbPath(path: string): Promise<{ success: boolean; path: string }> {
    try {
      await this.accessService.setAccessDbPath(path);
      return { success: true, path };
    } catch (error) {
      this.logger.error(`Error estableciendo ruta: ${error}`);
      throw error;
    }
  }
}
