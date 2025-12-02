import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee, EmployeeRole } from '../../entities/employee.entity';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createDto: CreateEmployeeDto): Promise<Employee> {
    const existing = await this.employeeRepository.findOne({
      where: { email: createDto.email },
    });

    if (existing) {
      throw new BadRequestException('Employee with this email already exists');
    }

    const employee = this.employeeRepository.create(createDto);
    return this.employeeRepository.save(employee) as any;
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

  async update(id: string, updateDto: UpdateEmployeeDto): Promise<Employee> {
    const employee = await this.findById(id);

    if (updateDto.email && updateDto.email !== employee.email) {
      const existing = await this.employeeRepository.findOne({
        where: { email: updateDto.email },
      });
      if (existing) {
        throw new BadRequestException('Email already in use');
      }
    }

    Object.assign(employee, updateDto);
    return this.employeeRepository.save(employee) as any;
  }

  async delete(id: string): Promise<void> {
    const employee = await this.findById(id);
    await this.employeeRepository.remove(employee);
  }

  async toggleActive(id: string): Promise<Employee> {
    const employee = await this.findById(id);
    employee.isActive = !employee.isActive;
    return this.employeeRepository.save(employee) as any;
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
}
