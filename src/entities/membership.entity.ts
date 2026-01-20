import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { MembershipAccessSchedule } from './membership-access-schedule.entity';

export enum MembershipType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
}

export enum PriceType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {
    to: (value: number) => {
      if (value === null || value === undefined) return null;
      return value;
    },
    from: (value: string | number) => {
      if (value === null || value === undefined) return 0;
      const parsed = parseFloat(String(value));
      // Redondear a 2 decimales para precisión
      return Math.round(parsed * 100) / 100;
    },
  }})
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: {
    to: (value: number) => {
      if (value === null || value === undefined) return null;
      return value;
    },
    from: (value: string | number) => {
      if (value === null || value === undefined) return 1;
      const parsed = parseFloat(String(value));
      return parsed > 0 ? parsed : 1;
    },
  }})
  durationMonths: number;

  @Column({ type: 'int', nullable: true })
  durationDays?: number; // Para membresías no recurrentes (días específicos en lugar de meses)

  @Column({ type: 'simple-array', nullable: true })
  benefits: string[];

  @Column({
    type: 'enum',
    enum: MembershipType,
    default: MembershipType.INDIVIDUAL,
  })
  type: MembershipType;

  @Column({ type: 'varchar', nullable: true })
  parentMembershipId: string;

  @ManyToOne(() => Membership, { nullable: true })
  @JoinColumn({ name: 'parentMembershipId' })
  parentMembership: Membership;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isRecurring: boolean; // Si es true, genera renovaciones automáticas. Si es false, solo pago inicial al asignar

  @Column({
    type: 'enum',
    enum: PriceType,
    default: PriceType.FIXED,
  })
  priceType: PriceType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: {
    to: (value: number) => {
      if (value === null || value === undefined) return null;
      return value;
    },
    from: (value: string | number) => {
      if (value === null || value === undefined) return null;
      const parsed = parseFloat(String(value));
      return Math.round(parsed * 100) / 100;
    },
  }})
  pricePerCompanion?: number; // Precio adicional por cada acompañante (solo para membresías grupales con priceType variable)

  @Column({ type: 'int', nullable: true })
  maxGroupCompanions?: number; // Máximo de acompañantes si es membresía grupal

  @OneToMany(() => MembershipAccessSchedule, (schedule) => schedule.membership, {
    cascade: true,
    eager: true,
  })
  accessSchedules?: MembershipAccessSchedule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
