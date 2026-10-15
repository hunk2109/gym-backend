import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';
import { CronLoggingService } from '../email-settings/cron-logging.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';

@Injectable()
export class MembershipsCronService {
  private readonly logger = new Logger(MembershipsCronService.name);

  private isRunning = false;

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly cronLoggingService: CronLoggingService,
    private readonly gymSettingsService: GymSettingsService,
  ) {}

  /**
   * Ejecuta renovación automática de membresías cada 6 horas
   * - Renueva membresías recurrentes con pago completado (creando cobro pendiente para el nuevo ciclo)
   * - Suspende membresías recurrentes con pago pendiente (> 15 días vencidas)
   * - Suspende membresías no recurrentes cuando vencen
   * - Envía notificaciones 3 días antes de la suspensión
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleMembershipRenewal() {
    if (this.isRunning) {
      this.logger.warn('MembershipRenewalJob ya está en ejecución, omitiendo ejecución simultánea');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'MembershipRenewalJob',
      'Automatic membership renewal - processes recurring/non-recurring memberships, creates pending payments, and sends notifications',
    );

    try {
      this.logger.log('Iniciando renovación automática de membresías...');

      const gymSettings = await this.gymSettingsService.getSettings();
      if (gymSettings?.enableMembershipRenewal === false) {
        this.logger.log('Renovación automática de membresías desactivada en configuración');
        await this.cronLoggingService.logCronSuccess(logId, 0, Date.now() - startTime);
        return;
      }

      const result = await this.membershipsService.autoRenewExpiredMemberships();

      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronSuccess(
        logId,
        result.renewed + result.suspended + result.notified + result.companions + result.reactivated,
        executionTimeMs,
      );

      this.logger.log(
        `Renovación completada: ${result.renewed} renovadas, ${result.suspended} suspendidas, ${result.notified} notificadas, ${result.companions} companions, ${result.reactivated} reactivadas en ${executionTimeMs}ms`,
      );
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronError(
        logId,
        error.message || 'Unknown error',
        executionTimeMs,
      );
      this.logger.error('Error durante renovación automática:', error);
    } finally {
      this.isRunning = false;
    }
  }
}
