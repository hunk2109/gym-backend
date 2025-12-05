import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeRole } from '../../entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { User } from '../../entities/user.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogService: AuditLogService,
  ) {}

  async create(createDto: CreateEmployeeDto, authUser?: any): Promise<Employee> {
    const existing = await this.employeeRepository.findOne({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new BadRequestException('Employee with this email already exists');
    }

    const employee = this.employeeRepository.create({
      ...createDto,
      hireDate: createDto.hireDate ? new Date(createDto.hireDate) : new Date(),
    });
    const createdEmployee = await this.employeeRepository.save(employee) as any;

    // Registrar creación en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = await this.getUserName(userId);
      
      await this.auditLogService.create({
        action: 'EMPLOYEE_CREATED',
        module: 'EMPLOYEES',
        description: `Empleado creado: ${createdEmployee.firstName} ${createdEmployee.lastName} (ID: ${createdEmployee.id})`,
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

    return createdEmployee;
  }

  async findAll(): Promise<Employee[]> {
    return this.employeeRepository.find({
      order: { lastName: 'ASC' },
    });
  }

  async findById(id: string): Promise<Employee> {
    const employee = await this.employeeRepository.findOne({ where: { id } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee;
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

    return updatedEmployee;
  }

  async delete(id: string, authUser?: any): Promise<void> {
    const employee = await this.findById(id);
    
    // Registrar eliminación en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = await this.getUserName(userId);
      
      await this.auditLogService.create({
        action: 'EMPLOYEE_DELETED',
        module: 'EMPLOYEES',
        description: `Empleado eliminado: ${employee.firstName} ${employee.lastName} (ID: ${id})`,
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
          isActive: employee.isActive,
        },
      });
    } catch (error) {
      console.error('Error logging employee deletion:', error);
      // No fallar la operación si el log falla
    }

    await this.employeeRepository.remove(employee);
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
}
