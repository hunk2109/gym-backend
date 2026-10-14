import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  role: string; // 'admin', 'encargado', 'empleado_cajero', 'empleado_entrenador'

  @Column({ type: 'simple-json' })
  permissions: string[]; // List of permission keys e.g. ['pos:access', 'pos:sell', ...]

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
