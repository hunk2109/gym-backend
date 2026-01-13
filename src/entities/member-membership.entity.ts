import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Membership } from './membership.entity';
import { Group } from './group.entity';

@Entity('member_memberships')
export class MemberMembership {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'varchar' })
  memberId: string;

  @ManyToOne(() => Membership, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membershipId' })
  membership: Membership;

  @Column({ type: 'varchar' })
  membershipId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  classesUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountPaid: number;

  @Column({ type: 'date', nullable: true })
  paymentDate: Date;

  @Column({ type: 'boolean', default: false })
  isRecurring: boolean;

  @Column({ type: 'date', nullable: true })
  suspensionDate: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  appliedPromotionCode?: string | null; // Código de cupón/promoción aplicado

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number; // Monto total del descuento en pesos

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountPercentage: number; // Porcentaje total de descuento aplicado

  @Column({ type: 'varchar', length: 255, nullable: true })
  discountReason?: string | null; // Razón del descuento adicional

  @ManyToOne(() => Group, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'groupId' })
  group?: Group;

  @Column({ type: 'varchar', nullable: true })
  groupId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'individual',
  })
  membershipType: 'individual' | 'responsible' | 'companion';
  // individual: Membresía individual
  // responsible: Es responsable de un grupo
  // companion: Es acompañante de un responsable

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
