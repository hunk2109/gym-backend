import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';

@Injectable()
export class MembershipsCronService {
  private readonly logger = new Logger(MembershipsCronService.name);

  constructor(private readonly membershipsService: MembershipsService) {}

  /**
   * Ejecuta renovación automática de membresías diariamente a las 2:00 AM
   * - Renueva membresías con pago pendiente (menos de 15 días vencidas)
   * - Suspende membresías con pago pendiente (más de 15 días vencidas)
   * 
   * DESHABILITADO: El cron se ejecutará cuando esté listo para production
   */
  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleMembershipRenewal() {
    try {
      this.logger.log('Iniciando renovación automática de membresías...');

      const result = await this.membershipsService.autoRenewExpiredMemberships();

      this.logger.log(
        `Renovación completada: ${result.renewed} renovadas, ${result.suspended} suspendidas`,
      );
    } catch (error) {
      this.logger.error('Error durante renovación automática:', error);
    }
  }
}
