import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { Promotion } from '../modules/promotions/entities/promotion.entity';

@Entity('gym_settings')
export class GymSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  gymName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'varchar' })
  phone: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  rnc: string;

  @Column({ type: 'varchar', nullable: true })
  website: string;

  @Column({ type: 'varchar' })
  openingTime: string; // HH:MM format

  @Column({ type: 'varchar' })
  closingTime: string; // HH:MM format

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  membershipPrice: number;

  @Column({ type: 'text', nullable: true })
  policies: string;

  @Column({ type: 'boolean', default: false })
  birthdayDiscountEnabled: boolean;

  @ManyToOne(() => Promotion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'birthdayDiscountCouponId' })
  birthdayDiscountCoupon: Promotion | null;

  @Column({ type: 'uuid', nullable: true })
  birthdayDiscountCouponId: string | null;

  @Column({ type: 'int', default: 15 })
  membershipSuspensionDays: number; // Días para suspender membresía con pago pendiente

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
