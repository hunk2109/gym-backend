import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as net from 'net';
import { GymSettings } from '../../../entities/gym-settings.entity';
import { AccessAttempt } from '../../../entities/access-attempt.entity';

interface MB360Response {
  success: boolean;
  message: string;
  data?: any;
}

interface MB360ConnectionConfig {
  ip: string;
  port: number;
  username: string;
  password: string;
  timeout?: number;
}

@Injectable()
export class MB360DeviceService {
  private readonly logger = new Logger(MB360DeviceService.name);
  private activeConnections: Map<string, net.Socket> = new Map();

  constructor(
    @InjectRepository(GymSettings)
    private gymSettingsRepository: Repository<GymSettings>,
    @InjectRepository(AccessAttempt)
    private accessAttemptRepository: Repository<AccessAttempt>,
  ) {}

  /**
   * Prueba la conexión con el dispositivo MB360
   */
  async testConnection(gymSettingsId: string): Promise<MB360Response> {
    try {
      const settings = await this.gymSettingsRepository.findOne({
        where: { id: gymSettingsId },
      });

      if (!settings || !settings.mb360Enabled) {
        throw new BadRequestException('MB360 no está habilitado');
      }

      if (!settings.mb360Ip || !settings.mb360Port) {
        throw new BadRequestException('Configuración MB360 incompleta');
      }

      const config: MB360ConnectionConfig = {
        ip: settings.mb360Ip,
        port: settings.mb360Port,
        username: settings.mb360Username || 'admin',
        password: settings.mb360Password || '12345',
        timeout: 5000,
      };

      const result = await this.connectToDevice(config);

      // Actualizar timestamp de última conexión exitosa
      settings.mb360LastHeartbeat = new Date();
      settings.mb360ConnectionStatus = 'online';
      await this.gymSettingsRepository.save(settings);

      return {
        success: true,
        message: 'Conexión exitosa con MB360',
        data: {
          ip: settings.mb360Ip,
          port: settings.mb360Port,
          timestamp: new Date().toISOString(),
          status: 'online',
        },
      };
    } catch (error) {
      this.logger.error(`Error en testConnection: ${error.message}`);
      
      // Actualizar estado a offline
      const settings = await this.gymSettingsRepository.findOne({
        where: { id: gymSettingsId },
      });
      if (settings) {
        settings.mb360ConnectionStatus = 'offline';
        await this.gymSettingsRepository.save(settings);
      }

      throw new BadRequestException(
        `No se pudo conectar al MB360: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene información del dispositivo MB360
   */
  async getDeviceInfo(gymSettingsId: string): Promise<MB360Response> {
    try {
      const settings = await this.gymSettingsRepository.findOne({
        where: { id: gymSettingsId },
      });

      if (!settings) {
        throw new BadRequestException('Configuración de gimnasio no encontrada');
      }

      return {
        success: true,
        message: 'Información del dispositivo',
        data: {
          enabled: settings.mb360Enabled,
          ip: settings.mb360Ip,
          port: settings.mb360Port,
          relayId: settings.mb360RelayId || 1,
          timezone: settings.mb360Timezone || 'America/Santo_Domingo',
          connectionStatus: settings.mb360ConnectionStatus || 'unknown',
          lastHeartbeat: settings.mb360LastHeartbeat?.toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error en getDeviceInfo: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Abre la puerta (activa relé)
   */
  async unlockDoor(gymSettingsId: string): Promise<MB360Response> {
    try {
      const settings = await this.gymSettingsRepository.findOne({
        where: { id: gymSettingsId },
      });

      if (!settings || !settings.mb360Enabled) {
        throw new BadRequestException('MB360 no está habilitado');
      }

      const config: MB360ConnectionConfig = {
        ip: settings.mb360Ip,
        port: settings.mb360Port,
        username: settings.mb360Username || 'admin',
        password: settings.mb360Password || '12345',
      };

      const relayId = settings.mb360RelayId || 1;
      
      // Comando para activar relé (simulado - ajustar según protocolo real del MB360)
      const result = await this.sendCommandToDevice(
        config,
        `RELAY,${relayId},1`,
      );

      this.logger.log(
        `[MB360] Puerta abierta - Relé ${relayId} activado`,
      );

      return {
        success: true,
        message: `Puerta abierta (Relé ${relayId})`,
        data: {
          relayId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error en unlockDoor: ${error.message}`);
      throw new BadRequestException(
        `No se pudo abrir la puerta: ${error.message}`,
      );
    }
  }

  /**
   * Obtiene últimos eventos/intentos de acceso
   */
  async getRecentAccessAttempts(
    gymSettingsId: string,
    limit: number = 50,
  ): Promise<MB360Response> {
    try {
      const attempts = await this.accessAttemptRepository.find({
        where: { gymSettingsId },
        relations: ['member'],
        order: { timestamp: 'DESC' },
        take: limit,
      });

      const summary = {
        total: attempts.length,
        successful: attempts.filter(a => a.status === 'success').length,
        denied: attempts.filter(a => a.status === 'denied').length,
        notFound: attempts.filter(a => a.status === 'not_found').length,
      };

      return {
        success: true,
        message: `${attempts.length} eventos registrados`,
        data: {
          summary,
          attempts: attempts.map(a => ({
            id: a.id,
            timestamp: a.timestamp.toISOString(),
            status: a.status,
            reason: a.reason,
            biometricType: a.biometricType,
            memberName: a.member?.user?.firstName ? `${a.member.user.firstName} ${a.member.user.lastName || ''}` : 'Desconocido',
            memberCode: a.member?.memberCode,
          })),
        },
      };
    } catch (error) {
      this.logger.error(`Error en getRecentAccessAttempts: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Registra un intento de acceso
   */
  async recordAccessAttempt(data: {
    gymSettingsId: string;
    status: 'success' | 'denied' | 'not_found';
    biometricType?: 'fingerprint' | 'face' | 'card';
    memberId?: string;
    reason?: string;
  }): Promise<AccessAttempt> {
    try {
      const attempt = this.accessAttemptRepository.create({
        gymSettingsId: data.gymSettingsId,
        memberId: data.memberId,
        status: data.status,
        biometricType: data.biometricType || 'fingerprint',
        reason: data.reason,
        timestamp: new Date(),
      });

      return await this.accessAttemptRepository.save(attempt);
    } catch (error) {
      this.logger.error(
        `Error en recordAccessAttempt: ${error.message}`,
      );
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtiene estadísticas de acceso del día
   */
  async getTodayStats(gymSettingsId: string): Promise<MB360Response> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAttempts = await this.accessAttemptRepository.find({
        where: { gymSettingsId },
      });

      const todayData = todayAttempts.filter(
        a => new Date(a.timestamp).toDateString() === today.toDateString(),
      );

      const stats = {
        totalAttempts: todayData.length,
        successfulAttempts: todayData.filter(a => a.status === 'success')
          .length,
        deniedAttempts: todayData.filter(a => a.status === 'denied').length,
        notFoundAttempts: todayData.filter(a => a.status === 'not_found')
          .length,
        uniqueMembers: new Set(
          todayData
            .filter(a => a.memberId)
            .map(a => a.memberId),
        ).size,
      };

      return {
        success: true,
        message: 'Estadísticas del día',
        data: { date: today.toISOString().split('T')[0], ...stats },
      };
    } catch (error) {
      this.logger.error(`Error en getTodayStats: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Método privado para conectar al dispositivo
   */
  private connectToDevice(config: MB360ConnectionConfig): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = config.timeout || 5000;

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('Conexión expirada'));
      }, timeout);

      socket.connect(config.port, config.ip, () => {
        clearTimeout(timer);
        this.logger.log(
          `[MB360] Conectado a ${config.ip}:${config.port}`,
        );
        
        // Enviar autenticación
        const authCmd = `CONNECT,${config.username},${config.password}`;
        socket.write(authCmd + '\r\n');

        socket.on('data', (data) => {
          socket.destroy();
          resolve(true);
        });

        socket.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Método privado para enviar comandos al dispositivo
   */
  private sendCommandToDevice(
    config: MB360ConnectionConfig,
    command: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = config.timeout || 5000;

      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error('Comando expirado'));
      }, timeout);

      socket.connect(config.port, config.ip, () => {
        // Autenticarse primero
        const authCmd = `CONNECT,${config.username},${config.password}`;
        socket.write(authCmd + '\r\n');

        socket.once('data', () => {
          // Enviar comando después de autenticarse
          socket.write(command + '\r\n');

          socket.once('data', (data) => {
            clearTimeout(timer);
            socket.destroy();
            resolve(data.toString());
          });
        });

        socket.on('error', (error) => {
          clearTimeout(timer);
          reject(error);
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  /**
   * Limpia conexiones activas
   */
  closeConnection(deviceId: string): void {
    const socket = this.activeConnections.get(deviceId);
    if (socket) {
      socket.destroy();
      this.activeConnections.delete(deviceId);
      this.logger.log(`[MB360] Conexión cerrada para ${deviceId}`);
    }
  }
}
