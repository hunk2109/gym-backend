import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Employee, EmployeeRole } from '../../entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { User, UserRole } from '../../entities/user.entity';
import { EmailService } from '../email-settings/email.service';
import { ModulesManagementService } from '../modules-management/modules-management.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { AccessService } from '../sync/access.service';
import { ZktecoDeviceService } from '../sync/zkteco-device.service';
import { WhatsappService, WhatsappStatus } from '../whatsapp-settings/whatsapp.service';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogService: AuditLogService,
    private emailService: EmailService,
    private modulesManagementService: ModulesManagementService,
    private gymSettingsService: GymSettingsService,
    private accessService: AccessService,
    private zktecoDeviceService: ZktecoDeviceService,
    private whatsappService: WhatsappService,
  ) {}

  async create(createDto: CreateEmployeeDto, authUser?: any): Promise<Employee> {
    const existing = await this.employeeRepository.findOne({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new BadRequestException('Employee with this email already exists');
    }

    // Generar accessCode (ej: 900001)
    const lastEmployeeWithCode = await this.employeeRepository
      .createQueryBuilder('employee')
      .where('employee.accessCode IS NOT NULL')
      .orderBy('employee.accessCode', 'DESC')
      .limit(1)
      .getOne();
    
    let nextCode = 900001;
    if (lastEmployeeWithCode && lastEmployeeWithCode.accessCode) {
      const parsed = parseInt(lastEmployeeWithCode.accessCode, 10);
      if (!isNaN(parsed)) {
        nextCode = parsed + 1;
      }
    }
    const accessCode = nextCode.toString();

    const employee = this.employeeRepository.create({
      ...createDto,
      accessCode,
      hireDate: createDto.hireDate ? new Date(createDto.hireDate) : new Date(),
    });
    const createdEmployee = await this.employeeRepository.save(employee) as any;

    const existingUser = await this.userRepository.findOne({ where: { email: createDto.email } });

    let tempPassword: string | null = null;
    if (!existingUser) {
      // Crear usuario automáticamente para el empleado
    try {
      tempPassword = this.generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      // Mapear rol de empleado a rol de usuario
      const userRole = this.mapEmployeeRoleToUserRole(createDto.role);

      const user = this.userRepository.create({
        id: uuidv4(),
        email: createDto.email,
        passwordHash: hashedPassword,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        phone: createDto.phone,
        role: userRole,
        isActive: true,
      });

      await this.userRepository.save(user);
      this.logger.log(`User created for employee ${createdEmployee.email}`);

      // Verificar si está habilitado enviar email de bienvenida
      try {
        const sendWelcomeEmail = await this.modulesManagementService.getModuleSetting(
          'employees',
          'sendWelcomeEmailToEmployees',
        );

        if (!sendWelcomeEmail) {
          this.logger.log(`Welcome email disabled for employees, skipping email for ${createdEmployee.email}`);
        } else {
          // Enviar email con contraseña temporal
          try {
            // Obtener nombre del gimnasio
            let gymName = 'GYM Manager';
            try {
              const gymSettings = await this.gymSettingsService.getSettings();
              if (gymSettings?.gymName) {
                gymName = gymSettings.gymName;
              }
            } catch (gymError) {
              this.logger.warn(`Failed to get gym settings: ${gymError.message}, using default gym name`);
            }

            await this.emailService.sendEmail({
              recipientEmail: createdEmployee.email,
              recipientName: `${createdEmployee.firstName} ${createdEmployee.lastName}`,
              subject: `¡Bienvenido a ${gymName}! - Acceso de Empleado`,
              htmlContent: this.generateEmployeeWelcomeEmailHTML(
                createdEmployee.firstName,
                createdEmployee.email,
                tempPassword,
                gymName,
              ),
            });
            
            this.logger.log(`Welcome email sent to employee ${createdEmployee.email}`);
          } catch (emailError) {
            this.logger.error(`Failed to send welcome email to employee ${createdEmployee.email}`, emailError);
          }
        }
      } catch (settingError) {
        this.logger.warn(`Failed to check email setting: ${settingError.message}, proceeding with email`);
      }
    } catch (userError) {
      this.logger.error(`Failed to create user for employee ${createdEmployee.email}`, userError);
      // No fallar la operación si el usuario no se crea
    }
    } else {
      this.logger.log(`User already exists for employee ${createdEmployee.email}, skipping user creation.`);
    }

      // SINCRONIZAR A ZKACCESS (Empleado sin límite de tiempo)
      try {
        this.logger.log(`[EmployeeService] 🔄 Empujando empleado a ZKAccess (USERINFO)...`);
        await this.accessService.pushMemberToAccess({
          Badgenumber: accessCode,
          name: createdEmployee.firstName,
          lastname: createdEmployee.lastName,
          email: createdEmployee.email,
          acc_startdate: new Date().toISOString().split('T')[0],
          acc_enddate: '2099-12-31'
        });
      } catch (accessError) {
        this.logger.error(`[EmployeeService] ❌ Falló la sincronización a Access del empleado ${createdEmployee.id}`, accessError);
      }

    // Registrar creación en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = await this.getUserName(userId);
      
      await this.auditLogService.create({
        action: 'EMPLOYEE_CREATED',
        module: 'EMPLOYEES',
        description: `Empleado creado: ${createdEmployee.firstName} ${createdEmployee.lastName} (ID: ${createdEmployee.id})${tempPassword ? ' - Usuario y contraseña temporal generados' : ''}`,
        userId: userId,
        userName: userName,
        newValue: {
          id: createdEmployee.id,
          firstName: createdEmployee.firstName,
          lastName: createdEmployee.lastName,
          email: createdEmployee.email,
          phone: createdEmployee.phone,
          role: createdEmployee.role,
          salary: createdEmployee.salary,
          hireDate: createdEmployee.hireDate,
        },
      });
    } catch (error) {
      console.error('Error logging employee creation:', error);
      // No fallar la operación si el log falla
    }

    await this.syncEmployeeToDeviceSafe(createdEmployee.id, 'create');

    return createdEmployee;
  }

  private async syncEmployeeToDeviceSafe(employeeId: string, reason: string): Promise<void> {
    try {
      await this.zktecoDeviceService.syncEmployeeById(employeeId);
      this.logger.log(`[EmployeeService] Empleado ${employeeId} sincronizado con equipo ZKTeco (${reason})`);
    } catch (error) {
      this.logger.warn(`[EmployeeService] No se pudo sincronizar empleado ${employeeId} con equipo ZKTeco (${reason}): ${error.message}`);
    }
  }

  private async deleteEmployeeFromDeviceSafe(employeeId: string, reason: string): Promise<void> {
    try {
      await this.zktecoDeviceService.deleteEmployeeById(employeeId);
      this.logger.log(`[EmployeeService] Empleado ${employeeId} removido del equipo ZKTeco (${reason})`);
    } catch (error) {
      this.logger.warn(`[EmployeeService] No se pudo remover empleado ${employeeId} del equipo ZKTeco (${reason}): ${error.message}`);
    }
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private mapEmployeeRoleToUserRole(employeeRole: EmployeeRole): UserRole {
    const roleMap = {
      [EmployeeRole.MANAGER]: UserRole.ENCARGADO,
      [EmployeeRole.TRAINER]: UserRole.EMPLEADO_ENTRENADOR,
      [EmployeeRole.RECEPTIONIST]: UserRole.EMPLEADO_CAJERO,
      [EmployeeRole.CLEANER]: UserRole.EMPLEADO_CAJERO,
      [EmployeeRole.NUTRITIONIST]: UserRole.EMPLEADO_ENTRENADOR,
      [EmployeeRole.SUPERVISOR]: UserRole.ENCARGADO,
      [EmployeeRole.CASHIER]: UserRole.EMPLEADO_CAJERO,
    };
    return roleMap[employeeRole] || UserRole.EMPLEADO_CAJERO;
  }

  private generateEmployeeWelcomeEmailHTML(firstName: string, email: string, tempPassword: string, gymName: string = 'GYM Manager'): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .credentials-box { background-color: #fff; border: 2px solid #007bff; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; color: #333; }
            .value { font-family: monospace; background-color: #f0f0f0; padding: 8px; border-radius: 3px; display: inline-block; margin-top: 5px; }
            .footer { color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 10px; border-radius: 3px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🏋️ ${gymName}</h2>
              <p>¡Bienvenido a tu cuenta de empleado!</p>
            </div>
            <div class="content">
              <p>Hola <strong>${firstName}</strong>,</p>
              <p>Tu cuenta de empleado ha sido creada exitosamente en ${gymName}.</p>
              
              <p><strong>Tus datos de acceso:</strong></p>
              <div class="credentials-box">
                <div class="credential-item">
                  <div class="label">📧 Email:</div>
                  <div class="value">${email}</div>
                </div>
                <div class="credential-item">
                  <div class="label">🔑 Contraseña Temporal:</div>
                  <div class="value">${tempPassword}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> 
                <ul>
                  <li>Guarda estas credenciales en un lugar seguro</li>
                  <li>La contraseña temporal es de un solo uso</li>
                  <li>Debes cambiarla en tu perfil después del primer inicio de sesión</li>
                  <li>No compartas tus credenciales con nadie</li>
                </ul>
              </div>
              
              <p><strong>Pasos a seguir:</strong></p>
              <ol>
                <li>Abre la aplicación GYM Manager</li>
                <li>Inicia sesión con tus credenciales</li>
                <li>Ve a "Editar Perfil"</li>
                <li>Crea una contraseña nueva y segura</li>
                <li>¡Listo! Ya puedes trabajar</li>
              </ol>
              
              <p>Si tienes problemas o preguntas, contacta al administrador.</p>
              
              <div class="footer">
                <p>© ${new Date().getFullYear()} ${gymName}. Todos los derechos reservados.</p>
                <p>Este es un correo automático, por favor no respondas.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      order: { lastName: 'ASC' },
    });
  }

  async findById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }
    return employee;
  }

  async findByEmail(email: string): Promise<Employee | null> {
    return this.employeeRepository.findOne({ where: { email } });
  }

  async findByRole(role: EmployeeRole): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { role, isActive: true },
      order: { lastName: 'ASC' },
    });
  }

  async findActive(): Promise<Employee[]> {
    return this.employeeRepository.find({
      where: { isActive: true },
      order: { lastName: 'ASC' },
    });
  }

  async update(id: string, updateDto: UpdateEmployeeDto, authUser?: any): Promise<Employee> {
    const employee = await this.findById(id);

    if (updateDto.email && updateDto.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: updateDto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Guardar valores anteriores para el log
    const oldValue = { ...employee };
    Object.assign(employee, updateDto);
    const updatedEmployee = await this.employeeRepository.save(employee) as any;

    // Registrar cambios en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = await this.getUserName(userId);
      
      const changes = Object.keys(updateDto).filter(key => oldValue[key] !== updateDto[key]);
      if (changes.length > 0) {
        await this.auditLogService.create({
          action: 'EMPLOYEE_UPDATED',
          module: 'EMPLOYEES',
          description: `Empleado actualizado: ${employee.firstName} ${employee.lastName} (ID: ${id})`,
          userId: userId,
          userName: userName,
          oldValue: { ...oldValue, id: undefined, createdAt: undefined, updatedAt: undefined },
          newValue: { ...updateDto },
        });
      } else {
      }
    } catch (error) {
      console.error('Error logging employee update:', error);
      // No fallar la operación si el log falla
    }

    await this.syncEmployeeToDeviceSafe(updatedEmployee.id, 'update');

    return updatedEmployee;
  }

  async delete(id: string, authUser?: any): Promise<void> {
    const employee = await this.findById(id);
    
    // En lugar de eliminar, desactivar el empleado (soft delete)
    // Esto evita problemas con restricciones de clave foránea
    const oldStatus = employee.isActive;
    employee.isActive = false;
    
    try {
      // Marcar usuario como inactivo también (sólo si no se pide omitirlo, por defecto sí se desactiva)
      if (authUser?.skipUserDeactivation !== true) {
        try {
          const user = await this.userRepository.findOne({
            where: { email: employee.email },
          });
          if (user) {
            user.isActive = false;
            await this.userRepository.save(user);
            this.logger.log(`User deactivated for employee ${employee.email}`);
          }
        } catch (userError) {
          this.logger.warn(`Failed to deactivate user for employee ${employee.email}: ${userError.message}`);
        }
      }

      // Guardar empleado como inactivo
      await this.employeeRepository.save(employee);
      this.logger.log(`Employee deactivated (soft delete): ${employee.id}`);

      // Bloquear en Access
      try {
        if (employee.accessCode) {
          this.logger.log(`[EmployeeService] 🔄 Bloqueando empleado en ZKAccess (USERINFO)...`);
          await this.accessService.pushMemberToAccess({
            Badgenumber: employee.accessCode,
            name: employee.firstName,
            lastname: employee.lastName,
            email: employee.email,
            acc_startdate: '2000-01-01',
            acc_enddate: '2000-01-01' // Fecha pasada para bloquear acceso
          });
        }
      } catch (accessError) {
        this.logger.error(`[EmployeeService] ❌ Falló la sincronización de bloqueo a Access del empleado ${employee.id}`, accessError);
      }

      await this.deleteEmployeeFromDeviceSafe(employee.id, 'delete');

      // Registrar eliminación en auditoría
      try {
        const userId = authUser?.id || authUser?.sub || authUser?.userId;
        const userName = await this.getUserName(userId);
        
        await this.auditLogService.create({
          action: 'EMPLOYEE_DELETED',
          module: 'EMPLOYEES',
          description: `Empleado eliminado (desactivado): ${employee.firstName} ${employee.lastName} (ID: ${id})`,
          userId: userId,
          userName: userName,
          oldValue: {
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            role: employee.role,
            salary: employee.salary,
            hireDate: employee.hireDate,
            isActive: oldStatus,
          },
          newValue: {
            isActive: false,
          },
        });
      } catch (error) {
        this.logger.warn(`Error logging employee deletion: ${error.message}`);
        // No fallar la operación si el log falla
      }
    } catch (error) {
      this.logger.error(`Failed to delete employee ${id}: ${error.message}`, error.stack);
      throw new BadRequestException(
        `No se pudo eliminar el empleado: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  async toggleActive(id: string, authUser?: any): Promise<Employee> {
    const employee = await this.findById(id);
    const oldStatus = employee.isActive;
    employee.isActive = !employee.isActive;
    const updatedEmployee = await this.employeeRepository.save(employee) as any;

    // Registrar cambio de estado en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = await this.getUserName(userId);
      
      await this.auditLogService.create({
        action: 'EMPLOYEE_STATUS_CHANGED',
        module: 'EMPLOYEES',
        description: `Estado del empleado ${employee.firstName} ${employee.lastName} cambiado de ${oldStatus ? 'Activo' : 'Inactivo'} a ${employee.isActive ? 'Activo' : 'Inactivo'}`,
        userId: userId,
        userName: userName,
        oldValue: { isActive: oldStatus },
        newValue: { isActive: employee.isActive },
      });
    } catch (error) {
      console.error('Error logging employee status change:', error);
      // No fallar la operación si el log falla
    }

    return updatedEmployee;
  }

  async getEmployeeStats(): Promise<{
    total: number;
    active: number;
    byRole: Record<EmployeeRole, number>;
  }> {
    const total = await this.employeeRepository.count();
    const active = await this.employeeRepository.count({
      where: { isActive: true },
    });

    const byRole: Record<EmployeeRole, number> = {} as any;
    for (const role of Object.values(EmployeeRole)) {
      byRole[role] = await this.employeeRepository.count({
        where: { role },
      });
    }

    return { total, active, byRole };
  }

  private async getUserName(userId?: string): Promise<string | undefined> {
    if (!userId) return undefined;
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        return user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.email;
      }
    } catch (error) {
      console.error('Error getting user name:', error);
    }
    return undefined;
  }

  async resetPasswordAndSendCredentials(user: User, employee: Employee) {
    try {
      const tempPassword = this.generateTemporaryPassword();
      user.passwordHash = await bcrypt.hash(tempPassword, 10);
      await this.userRepository.save(user);

      // Obtener nombre del gimnasio
      let gymName = 'GYM Manager';
      try {
        const gymSettings = await this.gymSettingsService.getSettings();
        if (gymSettings?.gymName) {
          gymName = gymSettings.gymName;
        }
      } catch (e) {}

      // Enviar correo si está habilitado
      try {
        const sendWelcomeEmail = await this.modulesManagementService.getModuleSetting('employees', 'sendWelcomeEmailToEmployees');
        if (sendWelcomeEmail) {
          await this.emailService.sendEmail({
            recipientEmail: user.email,
            recipientName: `${user.firstName} ${user.lastName}`,
            subject: `¡Bienvenido a ${gymName}! - Acceso de Empleado`,
            htmlContent: this.generateEmployeeWelcomeEmailHTML(user.firstName, user.email, tempPassword, gymName),
          });
          this.logger.log(`Credentials email sent to ${user.email}`);
        }
      } catch (e) {
        this.logger.error(`Failed to send credentials email to ${user.email}`, e);
      }

      // Enviar WhatsApp si está activo
      try {
        const statusInfo = this.whatsappService.getStatus();
        if (statusInfo && statusInfo.status === WhatsappStatus.CONNECTED) {
          const waMessage = `🏋️ *¡Bienvenido a tu cuenta de empleado en ${gymName}!*\n\nHola *${user.firstName}*, tu rol ha sido actualizado. Aquí tienes tus nuevas credenciales de acceso:\n\n📧 *Email:* ${user.email}\n🔑 *Contraseña temporal:* ${tempPassword}\n\n⚠️ Por favor, cambia tu contraseña al ingresar.\nNo compartas estos datos con nadie.`;
          await this.whatsappService.sendMessage(user.phone || employee.phone, waMessage);
          this.logger.log(`Credentials WhatsApp sent to ${user.phone || employee.phone}`);
        }
      } catch (e) {
        this.logger.error(`Failed to send credentials WhatsApp to ${user.email}`, e);
      }
    } catch (e) {
      this.logger.error(`Error in resetPasswordAndSendCredentials for ${user.email}`, e);
    }
  }
}
