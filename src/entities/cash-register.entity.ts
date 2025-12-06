import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('cash_registers')
export class CashRegister {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'date', nullable: true })
  registerDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  openingAmount: number;

  @Column({ type: 'text', nullable: true })
  openingBillBreakdown: string; // JSON: { 500: 2, 100: 5, ... }

  @Column({ type: 'text', nullable: true })
  openingReceipts: string; // JSON: { description, amount, quantity }

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  closingAmount: number;

  @Column({ type: 'text', nullable: true })
  closingBillBreakdown: string; // JSON: { 500: 2, 100: 5, ... }

  @Column({ type: 'text', nullable: true })
  closingReceipts: string; // JSON: { description, amount, quantity }

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  expectedClosure: number; // openingAmount + ventas del día

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  difference: number; // closingAmount - expectedClosure

  @Column({ type: 'boolean', default: false })
  isOpen: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;
}
