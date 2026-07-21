import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { EmployeeRole } from '../../entities/employee.entity';
import { PermissionsService } from '../auth/services/permissions.service';
import { EmployeeService } from '../employees/employee.service';
import { AccessService } from '../sync/access.service';
import { Member } from '../../entities/member.entity';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private readonly permissionsService: PermissionsService,
    @Inject(forwardRef(() => EmployeeService))
    private readonly employeeService: EmployeeService,
    private readonly accessService: AccessService,
  ) {}

  private mapUserRoleToEmployeeRole(userRole: UserRole): EmployeeRole {
    switch (userRole) {
      case UserRole.ADMIN:
      case UserRole.ENCARGADO:
        return EmployeeRole.SUPERVISOR;
      case UserRole.EMPLEADO_CAJERO:
        return EmployeeRole.CASHIER;
      case UserRole.EMPLEADO_ENTRENADOR:
        return EmployeeRole.TRAINER;
      default:
        return EmployeeRole.CASHIER;
    }
  }

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
    
    // Siempre asegurar que el usuario esté activo si se cambia a cliente o si se está cambiando de rol
    user.isActive = true;
    
    const updatedUser = await this.userRepository.save(user);

    // Log de acción sensible
    this.permissionsService.logSensitiveAction(
      requestingUserId,
      UserRole.ADMIN,
      'Assign Role',
      userId,
      { oldRole, newRole },
    );

    // Automatización de Empleado y ZKAccess basado en el rol
    try {
      if (oldRole === UserRole.CLIENTE && newRole !== UserRole.CLIENTE) {
        // Promoción: Cliente -> Empleado
        // Buscamos si ya tiene registro de empleado por su email
        const existingEmployee = await this.employeeService.findByEmail(user.email);
        if (existingEmployee) {
          // Reactivar empleado si existe
          if (!existingEmployee.isActive) {
            existingEmployee.isActive = true;
            existingEmployee.role = this.mapUserRoleToEmployeeRole(newRole);
            await this.employeeService.update(existingEmployee.id, existingEmployee);
            this.logger.log(`[UserRolesService] Empleado ${existingEmployee.id} reactivado tras cambio de rol a ${newRole}.`);
            
            // Empujar a ZKAccess
            if (existingEmployee.accessCode) {
              try {
                await this.accessService.pushMemberToAccess({
                  Badgenumber: existingEmployee.accessCode,
                  name: user.firstName,
                  lastname: user.lastName,
                  email: user.email,
                  acc_startdate: new Date().toISOString().split('T')[0],
                  acc_enddate: '2099-12-31'
                });
              } catch (accessError) {
                this.logger.error(`[UserRolesService] Error reactivando ZKAccess para empleado ${existingEmployee.id}`, accessError);
              }
            }
            
            // Enviar credenciales
            await this.employeeService.resetPasswordAndSendCredentials(user, existingEmployee);
          } else {
             // Solo actualizar el rol si ya estaba activo
             existingEmployee.role = this.mapUserRoleToEmployeeRole(newRole);
             await this.employeeService.update(existingEmployee.id, existingEmployee);
             
             // Opcional: si ya estaba activo, podríamos no reenviar contraseñas
             // Pero el usuario pidió que se manden las credenciales "cuando pase eso" (cuando se cambie el rol)
             await this.employeeService.resetPasswordAndSendCredentials(user, existingEmployee);
          }
        } else {
          // Crear empleado nuevo (salario 0)
          const createdEmployee = await this.employeeService.create({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone || '',
            role: this.mapUserRoleToEmployeeRole(newRole),
            salary: 0,
            specialization: 'General',
            hireDate: new Date().toISOString(),
          }, { id: requestingUserId });
          this.logger.log(`[UserRolesService] Empleado nuevo creado para usuario ${user.id} tras cambio de rol a ${newRole}.`);
          
          await this.employeeService.resetPasswordAndSendCredentials(user, createdEmployee);
        }
      } else if (oldRole !== UserRole.CLIENTE && newRole === UserRole.CLIENTE) {
        // Degradación: Empleado -> Cliente
        const existingEmployee = await this.employeeService.findByEmail(user.email);
        if (existingEmployee && existingEmployee.isActive) {
           await this.employeeService.delete(existingEmployee.id, { id: requestingUserId, skipUserDeactivation: true });
           this.logger.log(`[UserRolesService] Empleado ${existingEmployee.id} desactivado tras cambio de rol a ${newRole}.`);
        }
        
        // Asegurarnos de que exista como Miembro para que salga en la pantalla
        const existingMember = await this.memberRepository.findOne({ where: { userId: user.id } });
        if (!existingMember) {
          // Generar código de miembro
          const year = new Date().getFullYear();
          const lastMember = await this.memberRepository
            .createQueryBuilder('member')
            .where('member.memberCode LIKE :year', { year: `${year}-%` })
            .orderBy('member.memberCode', 'DESC')
            .limit(1)
            .getOne();
          
          let nextSequence = 1;
          if (lastMember && lastMember.memberCode) {
            nextSequence = parseInt(lastMember.memberCode.split('-')[1], 10) + 1;
          }
          const memberCode = `${year}-${String(nextSequence).padStart(4, '0')}`;

          await this.memberRepository.save({
            userId: user.id,
            memberCode: memberCode,
            emergencyContact: '',
            emergencyPhone: '',
          });
          this.logger.log(`[UserRolesService] Perfil de miembro creado para el usuario ${user.id}`);
        }
      }
    } catch (employeeSyncError) {
      this.logger.error(`[UserRolesService] Fallo en la sincronización de empleado al cambiar rol de ${user.id}`, employeeSyncError);
    }

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

  async getActiveClients(limit?: number, search?: string): Promise<User[]> {
    const query = this.userRepository.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.lastName', 'ASC');

    if (search) {
      query.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search) OR LOWER(user.phone) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }

    if (limit) {
      query.take(limit);
    }

    return query.getMany();
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
