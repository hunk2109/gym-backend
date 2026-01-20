import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';
import { CronLoggingService } from '../email-settings/cron-logging.service';

@Injectable()
export class MembershipsCronService {
  private readonly logger = new Logger(MembershipsCronService.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly cronLoggingService: CronLoggingService,
  ) {}

  /**
   * Ejecuta renovación automática de membresías cada 6 horas
   * - Renueva membresías recurrentes con pago completado
   * - Renueva membresías recurrentes con pago pendiente (< 15 días vencidas)
   * - Suspende membresías recurrentes con pago pendiente (> 15 días vencidas)
   * - Suspende membresías no recurrentes cuando vencen
   * - Envía notificaciones 3 días antes de la suspensión
   * - Crea automáticamente pagos pendientes para renovaciones
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleMembershipRenewal() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'MembershipRenewalJob',
      'Automatic membership renewal - processes recurring/non-recurring memberships, creates pending payments, and sends notifications',
    );

    try {
      this.logger.log('Iniciando renovación automática de membresías...');

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
    }
  }
}
