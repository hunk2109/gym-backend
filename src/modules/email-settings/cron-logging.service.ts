import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CronExecutionLog } from '../../entities/cron-execution-log.entity';

@Injectable()
export class CronLoggingService {
  private readonly logger = new Logger('CronLoggingService');

  constructor(
    @InjectRepository(CronExecutionLog)
    private cronLogRepository: Repository<CronExecutionLog>,
  ) {}

  /**
   * Registrar inicio de ejecución de cronjob
   */
  async logCronStart(cronName: string, description?: string): Promise<string | null> {
    try {
      const log = this.cronLogRepository.create({
        cronName,
        description,
        status: 'running',
        executedAt: new Date(),
      });
      const saved = await this.cronLogRepository.save(log);
      this.logger.log(`[${cronName}] ✓ Iniciado - Log ID: ${saved.id}`);
      return saved.id;
    } catch (error) {
      this.logger.error(`Error al registrar inicio de cron: ${error.message}`);
      return null;
    }
  }

  /**
   * Registrar conclusión exitosa de cronjob
   */
  async logCronSuccess(
    logId: string | null,
    itemsProcessed?: number,
    executionTimeMs?: number,
  ): Promise<void> {
    if (!logId) return;

    try {
      await this.cronLogRepository.update(logId, {
        status: 'success',
        itemsProcessed,
        executionTimeMs,
      });
      this.logger.log(
        `[CronLog ${logId}] ✅ Completado exitosamente - Items: ${itemsProcessed || 0}, Tiempo: ${executionTimeMs || 0}ms`,
      );
    } catch (error) {
      this.logger.error(`Error al registrar conclusión de cron: ${error.message}`);
    }
  }

  /**
   * Registrar error en cronjob
   */
  async logCronError(
    logId: string | null,
    errorMessage: string,
    executionTimeMs?: number,
  ): Promise<void> {
    if (!logId) return;

    try {
      await this.cronLogRepository.update(logId, {
        status: 'error',
        errorMessage,
        executionTimeMs,
      });
      this.logger.error(
        `[CronLog ${logId}] ❌ Error: ${errorMessage} - Tiempo: ${executionTimeMs || 0}ms`,
      );
    } catch (error) {
      this.logger.error(`Error al registrar error de cron: ${error.message}`);
    }
  }

  /**
   * Obtener últimos registros de ejecución
   */
  async getRecentLogs(limit: number = 50): Promise<CronExecutionLog[]> {
    return this.cronLogRepository.find({
      order: { executedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtener logs de un cronjob específico
   */
  async getLogsByCronName(
    cronName: string,
    limit: number = 20,
  ): Promise<CronExecutionLog[]> {
    return this.cronLogRepository.find({
      where: { cronName },
      order: { executedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtener estadísticas de cronjobs
   */
  async getCronStats(): Promise<any> {
    const logs = await this.cronLogRepository.find({
      order: { executedAt: 'DESC' },
      take: 100,
    });

    const stats = logs.reduce(
      (acc, log) => {
        if (!acc[log.cronName]) {
          acc[log.cronName] = {
            name: log.cronName,
            total: 0,
            success: 0,
            error: 0,
            lastRun: null,
            lastStatus: null,
          };
        }
        acc[log.cronName].total++;
        if (log.status === 'success') acc[log.cronName].success++;
        if (log.status === 'error') acc[log.cronName].error++;
        if (!acc[log.cronName].lastRun) {
          acc[log.cronName].lastRun = log.executedAt;
          acc[log.cronName].lastStatus = log.status;
        }
        return acc;
      },
      {} as any,
    );

    return Object.values(stats);
  }
}
