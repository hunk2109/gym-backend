import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('system_parameters')
export class SystemParameter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  parameterName: string; // 'creditSalesEnabled', 'discountsEnabled', etc.

  @Column()
  module: string; // 'SALES', 'INVENTORY', 'REPORTS', etc.

  @Column('boolean')
  value: boolean; // El valor del parámetro

  @Column({ type: 'text', nullable: true })
  description: string; // Descripción del parámetro

  @Column({ default: false })
  requiresApproval: boolean; // Si requiere aprobación para cambios

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  updatedBy: string; // UUID del usuario que modificó
}
