import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SaleItem } from './sale-item.entity';

export enum SaleStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  memberId: string;

  @ManyToOne(() => User, (user) => user.sales)
  @JoinColumn({ name: 'memberId' })
  member: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar' })
  paymentMethod: string;

  @Column({
    type: 'enum',
    enum: SaleStatus,
    default: SaleStatus.COMPLETED,
  })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => SaleItem, (item) => item.sale, { eager: true })
  items: SaleItem[];

  @CreateDateColumn()
  createdAt: Date;

  get finalAmount(): number {
    return this.totalAmount - this.discount;
  }
}
