import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // 'PARAMETER_CHANGED', 'PERMISSION_ENABLED', 'PERMISSION_DISABLED', etc.

  @Column()
  module: string; // 'SALES', 'INVENTORY', 'REPORTS', etc.

  @Column()
  description: string; // Descripción legible del cambio

  @Column('jsonb', { nullable: true })
  oldValue: any; // Valor anterior

  @Column('jsonb', { nullable: true })
  newValue: any; // Valor nuevo

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('varchar', { default: 'PENDING' })
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; // Para cambios sensibles que requieren aprobación

  @Column({ nullable: true })
  approvedBy: string; // UUID del usuario que aprobó

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string; // Razón del cambio o rechazo
}
