import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payroll, PayrollStatus } from '../../entities/payroll.entity';
import { Employee } from '../../entities/employee.entity';
import { CreatePayrollDto, UpdatePayrollDto, GeneratePayrollDto } from './dto/payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(Payroll)
    private payrollRepository: Repository<Payroll>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  async create(createDto: CreatePayrollDto): Promise<Payroll> {
    // Verificar que el empleado existe
    const employee = await this.employeeRepository.findOne({
      where: { id: createDto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    // Verificar que no existe una nómina duplicada
    const existing = await this.payrollRepository.findOne({
      where: {
        employeeId: createDto.employeeId,
        month: createDto.month,
        year: createDto.year,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Ya existe una nómina para este empleado en este mes',
      );
    }

    // Calcular el total
    const baseSalary = createDto.baseSalary || employee.salary;
    const bonuses = createDto.bonuses || 0;
    const holidayBonus = createDto.holidayBonus || 0;
    const afpDeduction = createDto.afpDeduction || 0;
    const isrDeduction = createDto.isrDeduction || 0;
    const applyTSS = createDto.applyTSS || false;
    const tssPercentage = createDto.tssPercentage || 2.87;
    const tssDeduction = applyTSS ? (baseSalary * tssPercentage) / 100 : (createDto.tssDeduction || 0);
    const otherDeductions = createDto.otherDeductions || 0;

    const totalDeductions = afpDeduction + isrDeduction + tssDeduction + otherDeductions;
    const totalAmount = baseSalary + bonuses + holidayBonus - totalDeductions;

    const payroll = this.payrollRepository.create({
      employeeId: createDto.employeeId,
      month: createDto.month,
      year: createDto.year,
      baseSalary,
      bonuses,
      holidayBonus,
      afpDeduction,
      isrDeduction,
      applyTSS,
      tssPercentage,
      tssDeduction,
      otherDeductions,
      totalAmount,
      notes: createDto.notes,
      status: PayrollStatus.DRAFT,
    });

    return this.payrollRepository.save(payroll);
  }

  async findAll(
    month?: number,
    year?: number,
    status?: PayrollStatus,
  ): Promise<Payroll[]> {
    const query = this.payrollRepository.createQueryBuilder('payroll')
      .leftJoinAndSelect('payroll.employee', 'employee');

    if (month) {
      query.andWhere('payroll.month = :month', { month });
    }
    if (year) {
      query.andWhere('payroll.year = :year', { year });
    }
    if (status) {
      query.andWhere('payroll.status = :status', { status });
    }

    return query.orderBy('payroll.year', 'DESC')
      .addOrderBy('payroll.month', 'DESC')
      .getMany();
  }

  async findById(id: string): Promise<Payroll> {
    const payroll = await this.payrollRepository.findOne({ where: { id } });
    if (!payroll) {
      throw new NotFoundException('Nómina no encontrada');
    }
    return payroll;
  }

  async findByEmployeeAndMonth(
    employeeId: string,
    month: number,
    year: number,
  ): Promise<Payroll | null> {
    return this.payrollRepository.findOne({
      where: { employeeId, month, year },
    });
  }

  async update(id: string, updateDto: UpdatePayrollDto): Promise<Payroll> {
    const payroll = await this.findById(id);

    // Solo se pueden actualizar ciertos campos
    if (updateDto.bonuses !== undefined) {
      payroll.bonuses = updateDto.bonuses;
    }
    if (updateDto.holidayBonus !== undefined) {
      payroll.holidayBonus = updateDto.holidayBonus;
    }
    if (updateDto.afpDeduction !== undefined) {
      payroll.afpDeduction = updateDto.afpDeduction;
    }
    if (updateDto.isrDeduction !== undefined) {
      payroll.isrDeduction = updateDto.isrDeduction;
    }
    if (updateDto.applyTSS !== undefined) {
      payroll.applyTSS = updateDto.applyTSS;
    }
    if (updateDto.tssPercentage !== undefined) {
      payroll.tssPercentage = updateDto.tssPercentage;
    }
    if (updateDto.tssDeduction !== undefined && !updateDto.applyTSS) {
      payroll.tssDeduction = updateDto.tssDeduction;
    }
    if (updateDto.otherDeductions !== undefined) {
      payroll.otherDeductions = updateDto.otherDeductions;
    }
    if (updateDto.status !== undefined) {
      payroll.status = updateDto.status;
    }
    if (updateDto.notes !== undefined) {
      payroll.notes = updateDto.notes;
    }

    // Recalcular TSS si está marcado como aplicable
    if (payroll.applyTSS) {
      payroll.tssDeduction = (payroll.baseSalary * payroll.tssPercentage) / 100;
    }

    // Recalcular total
    const totalDeductions =
      payroll.afpDeduction +
      payroll.isrDeduction +
      payroll.tssDeduction +
      payroll.otherDeductions;

    payroll.totalAmount =
      payroll.baseSalary +
      payroll.bonuses +
      payroll.holidayBonus -
      totalDeductions;

    return this.payrollRepository.save(payroll);
  }

  async delete(id: string): Promise<void> {
    const payroll = await this.findById(id);
    // Solo se pueden eliminar borradores
    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException('Solo se pueden eliminar nóminas en estado DRAFT');
    }
    await this.payrollRepository.remove(payroll);
  }

  async generateMonthlyPayroll(generateDto: GeneratePayrollDto): Promise<Payroll[]> {
    let employees: Employee[];

    if (generateDto.employeeIds && generateDto.employeeIds.length > 0) {
      // Generar para empleados específicos
      employees = await this.employeeRepository.find({
        where: { id: generateDto.employeeIds.toString() },
      });
    } else {
      // Generar para todos los empleados activos
      employees = await this.employeeRepository.find({
        where: { isActive: true },
      });
    }

    const createdPayrolls: Payroll[] = [];

    for (const employee of employees) {
      // Verificar que no existe ya
      const existing = await this.payrollRepository.findOne({
        where: {
          employeeId: employee.id,
          month: generateDto.month,
          year: generateDto.year,
        },
      });

      if (!existing) {
        const applyTSS = generateDto.applyTSS || false;
        const tssPercentage = generateDto.tssPercentage || 2.87;
        const tssDeduction = applyTSS ? (employee.salary * tssPercentage) / 100 : 0;
        
        const payroll = this.payrollRepository.create({
          employeeId: employee.id,
          month: generateDto.month,
          year: generateDto.year,
          baseSalary: employee.salary,
          bonuses: 0,
          holidayBonus: 0,
          afpDeduction: 0,
          isrDeduction: 0,
          applyTSS,
          tssPercentage,
          tssDeduction,
          otherDeductions: 0,
          totalAmount: applyTSS ? employee.salary - tssDeduction : employee.salary,
          status: PayrollStatus.DRAFT,
        });
        createdPayrolls.push(await this.payrollRepository.save(payroll));
      }
    }

    return createdPayrolls;
  }

  async approvePayroll(id: string): Promise<Payroll> {
    const payroll = await this.findById(id);
    payroll.status = PayrollStatus.APPROVED;
    return this.payrollRepository.save(payroll);
  }

  async markAsPaid(id: string, paidBy: string): Promise<Payroll> {
    const payroll = await this.findById(id);
    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException(
        'Solo se pueden marcar como pagadas las nóminas aprobadas',
      );
    }
    payroll.status = PayrollStatus.PAID;
    payroll.paidAt = new Date();
    payroll.paidBy = paidBy;
    return this.payrollRepository.save(payroll);
  }

  async getPayrollStats(month: number, year: number): Promise<any> {
    const payrolls = await this.payrollRepository.find({
      where: { month, year },
    });

    const total = payrolls.reduce((sum, p) => sum + p.totalAmount, 0);
    const byStatus = {
      draft: payrolls.filter(p => p.status === PayrollStatus.DRAFT).length,
      pending: payrolls.filter(p => p.status === PayrollStatus.PENDING).length,
      approved: payrolls.filter(p => p.status === PayrollStatus.APPROVED).length,
      paid: payrolls.filter(p => p.status === PayrollStatus.PAID).length,
      cancelled: payrolls.filter(p => p.status === PayrollStatus.CANCELLED).length,
    };

    return {
      month,
      year,
      totalPayrolls: payrolls.length,
      totalAmount: total,
      byStatus,
    };
  }

  async generateWithDeductionOptions(options: any): Promise<Payroll[]> {
    let employees: Employee[];

    if (options.employeeIds && options.employeeIds.length > 0) {
      employees = await this.employeeRepository.find({
        where: options.employeeIds.map(id => ({ id })),
      });
    } else {
      employees = await this.employeeRepository.find({
        where: { isActive: true },
      });
    }

    const createdPayrolls: Payroll[] = [];

    for (const employee of employees) {
      const existing = await this.payrollRepository.findOne({
        where: {
          employeeId: employee.id,
          month: options.month,
          year: options.year,
        },
      });

      if (!existing) {
        // Calcular deducciones según opciones
        const baseSalary = employee.salary;
        const afpDeduction = options.applyAFP ? (baseSalary * (options.afpPercentage || 2.87)) / 100 : 0;
        const isrDeduction = options.applyISR ? (baseSalary * (options.isrPercentage || 2.87)) / 100 : 0;
        const tssDeduction = options.applyTSS ? (baseSalary * (options.tssPercentage || 2.87)) / 100 : 0;
        const otherDeductions = options.otherDeductions || 0;

        const payroll = this.payrollRepository.create({
          employeeId: employee.id,
          month: options.month,
          year: options.year,
          baseSalary,
          bonuses: 0,
          holidayBonus: 0,
          afpDeduction,
          isrDeduction,
          applyTSS: options.applyTSS || false,
          tssPercentage: options.tssPercentage || 2.87,
          tssDeduction,
          otherDeductions,
          totalAmount: baseSalary - (afpDeduction + isrDeduction + tssDeduction + otherDeductions),
          status: PayrollStatus.DRAFT,
        });
        createdPayrolls.push(await this.payrollRepository.save(payroll));
      }
    }

    return createdPayrolls;
  }
}
