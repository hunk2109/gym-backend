import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AccountPayableStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('accounts_payable')
export class AccountPayable {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  concept: string;

  @Column({ type: 'varchar', nullable: true })
  providerName: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: AccountPayableStatus,
    default: AccountPayableStatus.PENDING,
  })
  status: AccountPayableStatus;

  @Column({ type: 'date', nullable: true })
  dueDate: Date | null;

  @Column({ type: 'boolean', default: false })
  isCashWithdrawal: boolean;

  @Column({ type: 'uuid', nullable: true })
  cashRegisterId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
