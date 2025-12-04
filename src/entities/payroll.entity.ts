import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('payrolls')
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  employeeId: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employeeId' })
  employee: Employee;

  @Column({ type: 'int' })
  month: number; // 1-12

  @Column({ type: 'int' })
  year: number; // 2024, 2025, etc.

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseSalary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonuses: number; // Bonificaciones extras

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  holidayBonus: number; // Regalía de Navidad, bono especial

  // Deducciones dominicanas
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  afpDeduction: number; // AFP (Administradora de Fondos de Pensiones) ~2.87%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  isrDeduction: number; // ISR (Impuesto Sobre la Renta) variable según salario

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tssDeduction: number; // TSS (Tesorería de la Seguridad Social) ~2.87%

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  otherDeductions: number; // Otras deducciones (multas, adelantos, etc.)

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number; // baseSalary + bonuses + holidayBonus - (afp + isr + tss + other)

  @Column({
    type: 'enum',
    enum: PayrollStatus,
    default: PayrollStatus.DRAFT,
  })
  status: PayrollStatus;

  @Column({ type: 'text', nullable: true })
  notes: string; // Notas adicionales

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  paidAt: Date; // Fecha cuando se pagó

  @Column({ type: 'varchar', nullable: true })
  paidBy: string; // ID del usuario que marcó como pagado
}
