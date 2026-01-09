import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipAccessScheduleService } from '../modules/memberships/membership-access-schedule.service';

@Injectable()
export class AccessScheduleGuard implements CanActivate {
  private readonly logger = new Logger(AccessScheduleGuard.name);

  constructor(
    private reflector: Reflector,
    private accessScheduleService: MembershipAccessScheduleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const memberId = request.body?.memberId || request.params?.memberId || request.user?.id;

    if (!memberId) {
      throw new ForbiddenException('Member ID not provided');
    }

    this.logger.log(`[AccessScheduleGuard] Validando acceso para miembro ${memberId}`);

    const validation = await this.accessScheduleService.validateMemberAccessBySchedule(memberId);

    if (!validation.allowed) {
      this.logger.warn(`[AccessScheduleGuard] Acceso denegado: ${validation.reason}`);
      throw new ForbiddenException({
        message: 'Access denied',
        reason: validation.reason,
        membership: validation.membership,
      });
    }

    this.logger.log(`[AccessScheduleGuard] Acceso permitido para ${memberId}`);
    request.membershipInfo = validation; // Guardar info para usar en el controlador
    return true;
  }
}
