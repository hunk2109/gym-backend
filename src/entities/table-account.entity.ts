import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Table } from './table.entity';
import { TableAccountItem } from './table-account-item.entity';
import { User } from './user.entity';

export enum AccountStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('table_accounts')
export class TableAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tableId: string;

  @ManyToOne(() => Table, (table) => table.accounts)
  @JoinColumn({ name: 'tableId' })
  table: Table;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.OPEN,
  })
  status: AccountStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'uuid', nullable: true })
  saleId: string | null; // Referencia a la venta generada al cerrar

  @OneToMany(() => TableAccountItem, (item) => item.account, { eager: true })
  @JoinColumn({ name: 'id' })
  items: TableAccountItem[];

  @CreateDateColumn()
  openedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get finalAmount(): number {
    return Number(this.totalAmount) - Number(this.discount);
  }
}
