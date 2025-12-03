import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { UserRole } from '../../../entities/user.entity';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  /**
   * Verifica si un usuario tiene uno de los roles requeridos
   * @param userRole Rol del usuario
   * @param requiredRoles Roles que se permiten
   * @param userId ID del usuario (para logging)
   * @param action Descripción de la acción (para logging)
   * @returns true si el usuario tiene permiso
   * @throws ForbiddenException si no tiene permiso
   */
  hasRole(
    userRole: UserRole,
    requiredRoles: UserRole[],
    userId?: string,
    action?: string,
  ): boolean {
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Log del intento no autorizado
    this.logUnauthorizedAttempt(userId, userRole, requiredRoles, action);
    throw new ForbiddenException(
      `User role '${userRole}' does not have permission for this action. Required: ${requiredRoles.join(', ')}`,
    );
  }

  /**
   * Verifica que el usuario sea ADMIN
   */
  requireAdmin(userRole: UserRole, userId?: string, action?: string): void {
    if (userRole !== UserRole.ADMIN) {
      this.logUnauthorizedAttempt(userId, userRole, [UserRole.ADMIN], action);
      throw new ForbiddenException('Only ADMIN users can perform this action');
    }
  }

  /**
   * Verifica que el usuario sea ADMIN o ENCARGADO
   */
  requireAdminOrManager(userRole: UserRole, userId?: string, action?: string): void {
    if (![UserRole.ADMIN, UserRole.ENCARGADO].includes(userRole)) {
      this.logUnauthorizedAttempt(
        userId,
        userRole,
        [UserRole.ADMIN, UserRole.ENCARGADO],
        action,
      );
      throw new ForbiddenException(
        'Only ADMIN or ENCARGADO users can perform this action',
      );
    }
  }

  /**
   * Verifica que el usuario sea ADMIN, ENCARGADO o EMPLEADO_CAJERO
   */
  requireStaff(userRole: UserRole, userId?: string, action?: string): void {
    const allowedRoles = [
      UserRole.ADMIN,
      UserRole.ENCARGADO,
      UserRole.EMPLEADO_CAJERO,
    ];
    if (!allowedRoles.includes(userRole)) {
      this.logUnauthorizedAttempt(userId, userRole, allowedRoles, action);
      throw new ForbiddenException(
        'Staff members only can perform this action',
      );
    }
  }

  /**
   * Verifica que el usuario pertenezca a su propio recurso
   * (para acceso a datos personales)
   */
  requireOwnerOrAdmin(
    userRole: UserRole,
    userId: string,
    resourceOwnerId: string,
    action?: string,
  ): void {
    if (userRole !== UserRole.ADMIN && userId !== resourceOwnerId) {
      this.logger.warn(
        `[UNAUTHORIZED] User ${userId} tried to access resource of ${resourceOwnerId}. Action: ${action || 'unknown'}`,
      );
      throw new ForbiddenException(
        'You can only access your own resources',
      );
    }
  }

  /**
   * Log de intento de acceso no autorizado
   */
  private logUnauthorizedAttempt(
    userId: string | undefined,
    userRole: UserRole,
    requiredRoles: UserRole[],
    action?: string,
  ): void {
    const actionText = action ? ` performing action: ${action}` : '';
    this.logger.warn(
      `[UNAUTHORIZED_ATTEMPT] User ${userId || 'unknown'} with role '${userRole}' tried to access protected resource${actionText}. Required roles: ${requiredRoles.join(', ')}`,
    );
  }

  /**
   * Log de acción autorizada exitosa
   */
  logAuthorizedAction(
    userId: string,
    userRole: UserRole,
    action: string,
    details?: Record<string, any>,
  ): void {
    const detailsText = details ? ` | Details: ${JSON.stringify(details)}` : '';
    this.logger.log(
      `[AUTHORIZED] User ${userId} (${userRole}) - Action: ${action}${detailsText}`,
    );
  }

  /**
   * Log de operación sensible (eliminación, cambio de rol, etc)
   */
  logSensitiveAction(
    userId: string,
    userRole: UserRole,
    action: string,
    targetId?: string,
    details?: Record<string, any>,
  ): void {
    const targetText = targetId ? ` | Target: ${targetId}` : '';
    const detailsText = details ? ` | Details: ${JSON.stringify(details)}` : '';
    this.logger.log(
      `[SENSITIVE_ACTION] User ${userId} (${userRole}) - Action: ${action}${targetText}${detailsText}`,
    );
  }
}
