import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../entities/user.entity';

export const REQUIRE_ROLE_KEY = 'requireRole';

/**
 * Decorator para requerir un rol específico en una operación
 * Se usa cuando necesitas múltiples niveles de validación
 * Ejemplo: @RequireRole(UserRole.ADMIN) para operaciones críticas
 */
export const RequireRole = (role: UserRole) => SetMetadata(REQUIRE_ROLE_KEY, role);
