import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  discountPercentage: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', nullable: true })
  maxUsages: number; // null = sin límite

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'date', nullable: true })
  expiryDate: Date;

  @Column({ type: 'enum', enum: ['GENERAL', 'BIRTHDAY', 'MEMBERSHIP', 'PROMOTION'], default: 'GENERAL' })
  type: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
