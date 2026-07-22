import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum AccountReceivableStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('accounts_receivable')
export class AccountReceivable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  memberId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'memberId' })
  member: User;

  @Column({ type: 'varchar' })
  concept: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: AccountReceivableStatus,
    default: AccountReceivableStatus.PENDING,
  })
  status: AccountReceivableStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
