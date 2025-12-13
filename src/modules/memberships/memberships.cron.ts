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
   * Ejecuta renovación automática de membresías cada 30 minutos
   * - Renueva membresías con pago pendiente (menos de 15 días vencidas)
   * - Suspende membresías con pago pendiente (más de 15 días vencidas)
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleMembershipRenewal() {
    const startTime = Date.now();
    const logId = await this.cronLoggingService.logCronStart(
      'MembershipRenewalJob',
      'Automatic membership renewal every day at 2 AM',
    );

    try {
      this.logger.log('Iniciando renovación automática de membresías...');

      const result = await this.membershipsService.autoRenewExpiredMemberships();

      const executionTimeMs = Date.now() - startTime;
      await this.cronLoggingService.logCronSuccess(
        logId,
        result.renewed + result.suspended,
        executionTimeMs,
      );

      this.logger.log(
        `Renovación completada: ${result.renewed} renovadas, ${result.suspended} suspendidas en ${executionTimeMs}ms`,
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
