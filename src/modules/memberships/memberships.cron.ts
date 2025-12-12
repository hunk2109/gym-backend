import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from './memberships.service';

@Injectable()
export class MembershipsCronService {
  private readonly logger = new Logger(MembershipsCronService.name);

  constructor(private readonly membershipsService: MembershipsService) {}

  /**
   * Ejecuta renovación automática de membresías cada 30 minutos
   * - Renueva membresías con pago pendiente (menos de X días vencidas)
   * - Suspende membresías con pago pendiente (más de X días vencidas)
   */
  @Cron('0 */30 * * * *')
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
