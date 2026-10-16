import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { EmployeeRole } from '../../entities/employee.entity';
import { RolePermission } from '../../entities/role-permission.entity';
import { PermissionsService } from '../auth/services/permissions.service';
import { EmployeeService } from '../employees/employee.service';
import { AccessService } from '../sync/access.service';
import { Member } from '../../entities/member.entity';
import { SYSTEM_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PermissionDefinition } from './permissions-catalog';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(RolePermission)
    private rolePermissionRepository: Repository<RolePermission>,
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(`Invalid role: ${newRole}`);
    }

    const oldRole = user.role;
    user.role = newRole;
    user.isActive = true;
    
    const updatedUser = await this.userRepository.save(user);

    this.permissionsService.logSensitiveAction(
      requestingUserId,
      UserRole.ADMIN,
      'Assign Role',
      userId,
      { oldRole, newRole },
    );

    try {
      if (oldRole === UserRole.CLIENTE && newRole !== UserRole.CLIENTE) {
        const existingEmployee = await this.employeeService.findByEmail(user.email);
        if (existingEmployee) {
          if (!existingEmployee.isActive) {
            existingEmployee.isActive = true;
            existingEmployee.role = this.mapUserRoleToEmployeeRole(newRole);
            await this.employeeService.update(existingEmployee.id, existingEmployee);
            this.logger.log(`[UserRolesService] Empleado ${existingEmployee.id} reactivado tras cambio de rol a ${newRole}.`);
            
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
            
            await this.employeeService.resetPasswordAndSendCredentials(user, existingEmployee);
          } else {
             existingEmployee.role = this.mapUserRoleToEmployeeRole(newRole);
             await this.employeeService.update(existingEmployee.id, existingEmployee);
             await this.employeeService.resetPasswordAndSendCredentials(user, existingEmployee);
          }
        } else {
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
        const existingEmployee = await this.employeeService.findByEmail(user.email);
        if (existingEmployee && existingEmployee.isActive) {
           await this.employeeService.delete(existingEmployee.id, { id: requestingUserId, skipUserDeactivation: true });
           this.logger.log(`[UserRolesService] Empleado ${existingEmployee.id} desactivado tras cambio de rol a ${newRole}.`);
        }
        
        const existingMember = await this.memberRepository.findOne({ where: { userId: user.id } });
        if (!existingMember) {
          let memberCode: string | null = null;
          let zkUid: number | undefined;

          try {
            const accessRes = await this.accessService.findOrCreateAccessMember({
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone,
              documentId: '',
              acc_startdate: '2000-01-01',
              acc_enddate: '2000-01-01',
            });
            if (accessRes?.badgeNumber) {
              memberCode = accessRes.badgeNumber;
              const numBadge = Number(accessRes.badgeNumber);
              zkUid = Number.isFinite(numBadge) ? numBadge : accessRes.USERID;
            }
          } catch (e) {
            this.logger.warn(`[UserRolesService] No se pudo obtener badge desde Access: ${e.message}`);
          }

          if (!memberCode) {
            memberCode = await this.accessService.getNextSequentialMemberCode();
            const numCode = Number(memberCode);
            zkUid = Number.isFinite(numCode) ? numCode : undefined;
          }

          await this.memberRepository.save({
            userId: user.id,
            memberCode: memberCode,
            zkUid: zkUid,
            emergencyContact: '',
            emergencyPhone: '',
          });
          this.logger.log(`[UserRolesService] Perfil de miembro creado para el usuario ${user.id} con código ${memberCode}`);
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

    this.permissionsService.logSensitiveAction(
      requestingUserId,
      requestingUser.role,
      'Toggle User Status',
      userId,
      { oldStatus, newStatus: updatedUser.isActive },
    );

    return updatedUser;
  }

  // ================= PERMISOS DINÁMICOS POR ROL =================

  getPermissionsCatalog(): PermissionDefinition[] {
    return SYSTEM_PERMISSIONS;
  }

  async getAllRolePermissions(): Promise<Record<string, string[]>> {
    const saved = await this.rolePermissionRepository.find();
    const savedMap = new Map<string, string[]>();
    for (const r of saved) {
      savedMap.set(r.role, Array.isArray(r.permissions) ? r.permissions : []);
    }

    const result: Record<string, string[]> = {};
    const roles = [
      UserRole.ADMIN,
      UserRole.ENCARGADO,
      UserRole.EMPLEADO_CAJERO,
      UserRole.EMPLEADO_ENTRENADOR,
    ];

    for (const role of roles) {
      if (savedMap.has(role)) {
        result[role] = savedMap.get(role)!;
      } else {
        result[role] = DEFAULT_ROLE_PERMISSIONS[role] || [];
      }
    }

    return result;
  }

  async getPermissionsForRole(role: string): Promise<string[]> {
    const saved = await this.rolePermissionRepository.findOne({
      where: { role },
    });

    if (saved && Array.isArray(saved.permissions)) {
      return saved.permissions;
    }

    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  }

  async updateRolePermissions(
    role: string,
    permissions: string[],
    requestingUserId: string,
  ): Promise<string[]> {
    let rolePerm = await this.rolePermissionRepository.findOne({
      where: { role },
    });

    if (!rolePerm) {
      rolePerm = this.rolePermissionRepository.create({
        role,
        permissions,
      });
    } else {
      rolePerm.permissions = permissions;
    }

    await this.rolePermissionRepository.save(rolePerm);

    this.permissionsService.logSensitiveAction(
      requestingUserId,
      UserRole.ADMIN,
      'Update Role Permissions',
      role,
      { count: permissions.length },
    );

    return rolePerm.permissions;
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return [];
    return this.getPermissionsForRole(user.role);
  }
}
