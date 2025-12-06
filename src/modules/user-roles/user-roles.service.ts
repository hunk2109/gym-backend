import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { PermissionsService } from '../auth/services/permissions.service';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async assignRole(userId: string, newRole: UserRole, requestingUserId: string): Promise<User> {
    // El RolesGuard ya verificó que el usuario tiene rol ADMIN
    // Confiar en el token JWT validado
    
    // Buscar al usuario cuyo rol será cambiado
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validar que el nuevo rol sea válido
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    const oldRole = user.role;
    user.role = newRole;
    const updatedUser = await this.userRepository.save(user);

    // Log de acción sensible
    this.permissionsService.logSensitiveAction(
      requestingUserId,
      UserRole.ADMIN,
      'Assign Role',
      userId,
      { oldRole, newRole },
    );

    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.CLIENTE },
      order: { lastName: 'ASC' },
    });
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.userRepository.find({
      where: { role },
      order: { lastName: 'ASC' },
    });
  }

  async getActiveClients(): Promise<User[]> {
    return this.userRepository.find({
      where: { isActive: true },
      order: { lastName: 'ASC' },
    });
  }

  async toggleUserActive(userId: string, requestingUserId: string): Promise<User> {
    const requestingUser = await this.userRepository.findOne({
      where: { id: requestingUserId },
    });

    if (!requestingUser) {
      throw new NotFoundException('Requesting user not found');
    }

    // Verificación doble: Solo ADMIN/ENCARGADO puede cambiar estado
    this.permissionsService.requireAdminOrManager(
      requestingUser.role,
      requestingUserId,
      `toggleUserActive for ${userId}`,
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldStatus = user.isActive;
    user.isActive = !user.isActive;
    const updatedUser = await this.userRepository.save(user);

    // Log de acción sensible
    this.permissionsService.logSensitiveAction(
      requestingUserId,
      requestingUser.role,
      'Toggle User Status',
      userId,
      { oldStatus, newStatus: updatedUser.isActive },
    );

    return updatedUser;
  }
}
