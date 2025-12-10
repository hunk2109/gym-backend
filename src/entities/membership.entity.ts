import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum MembershipType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
}

@Entity('memberships')
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'int' })
  durationMonths: number;

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

  @Column({ type: 'int', nullable: true })
  maxGroupCompanions?: number; // Máximo de acompañantes si es membresía grupal

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
