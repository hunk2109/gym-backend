import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum EmployeeRole {
  MANAGER = 'manager',
  TRAINER = 'trainer',
  RECEPTIONIST = 'receptionist',
  CLEANER = 'cleaner',
  NUTRITIONIST = 'nutritionist',
}

@Entity('employees')
export class Employee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  position: string;

  @Column({
    type: 'enum',
    enum: EmployeeRole,
    default: EmployeeRole.TRAINER,
  })
  role: EmployeeRole;

  @Column({ type: 'date' })
  hireDate: Date;

  @Column({ type: 'varchar', nullable: true })
  specialization: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  salary: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  emergencyContact: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
