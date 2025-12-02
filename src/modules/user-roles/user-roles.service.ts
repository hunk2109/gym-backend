import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class UserRolesService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async assignRole(userId: string, newRole: UserRole, requestingUserId: string): Promise<User> {
    // Verificar que el usuario que hace la solicitud es ADMIN o ENCARGADO
    const requestingUser = await this.userRepository.findOne({
      where: { id: requestingUserId },
    });

    if (!requestingUser) {
      throw new NotFoundException('Requesting user not found');
    }

    if (requestingUser.role !== UserRole.ADMIN && requestingUser.role !== UserRole.ENCARGADO) {
      throw new ForbiddenException('Only ADMIN or ENCARGADO can assign roles');
    }

    // Buscar al usuario cuyo rol será cambiado
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // No permitir cambiar rol de ADMIN si el que solicita no es ADMIN
    if (user.role === UserRole.ADMIN && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only ADMIN can change ADMIN role');
    }

    // Validar que el nuevo rol sea válido
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    user.role = newRole;
    return this.userRepository.save(user);
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
      where: { role: UserRole.CLIENTE, isActive: true },
      order: { lastName: 'ASC' },
    });
  }

  async toggleUserActive(userId: string, requestingUserId: string): Promise<User> {
    const requestingUser = await this.userRepository.findOne({
      where: { id: requestingUserId },
    });

    if (!requestingUser || (requestingUser.role !== UserRole.ADMIN && requestingUser.role !== UserRole.ENCARGADO)) {
      throw new ForbiddenException('Only ADMIN or ENCARGADO can toggle user status');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }
}
