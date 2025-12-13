import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TableAccount } from './table-account.entity';

export enum TableStatus {
  AVAILABLE = 'available',
  OPEN = 'open',
  OCCUPIED = 'occupied',
}

@Entity('tables')
export class Table {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', unique: true })
  tableNumber: number;

  @Column({
    type: 'enum',
    enum: TableStatus,
    default: TableStatus.AVAILABLE,
  })
  status: TableStatus;

  @Column({ type: 'int', default: 4 })
  capacity: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => TableAccount, (account) => account.table)
  @JoinColumn({ name: 'id' })
  accounts: TableAccount[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
