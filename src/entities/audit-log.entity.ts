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

  @Column('json', { nullable: true })
  oldValue: any; // Valor anterior

  @Column('json', { nullable: true })
  newValue: any; // Valor nuevo

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string; // Nombre/email del usuario para mostrar en auditoría

  @ManyToOne(() => User, { nullable: true })
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
