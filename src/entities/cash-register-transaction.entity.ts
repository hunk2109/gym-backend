import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum CashRegisterTransactionType {
  IN = 'in',
  OUT = 'out',
}

@Entity('cash_register_transactions')
export class CashRegisterTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  cashRegisterId: string;

  @Column({
    type: 'enum',
    enum: CashRegisterTransactionType,
  })
  type: CashRegisterTransactionType;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  amount: number;

  @Column({ type: 'varchar' })
  concept: string;

  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null; // e.g. AccountPayable id

  @CreateDateColumn()
  createdAt: Date;
}
