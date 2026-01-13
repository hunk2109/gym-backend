import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MemberMembership } from './member-membership.entity';

export enum MemberGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('members')
export class Member {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  userId: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  memberCode: string;

  @Column({ type: 'varchar', nullable: true })
  documentId: string;

  @Column({ type: 'varchar', nullable: true })
  emergencyContact: string;

  @Column({ type: 'varchar', nullable: true })
  emergencyPhone: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({
    type: 'enum',
    enum: MemberGender,
    default: MemberGender.OTHER,
    nullable: true,
  })
  gender: MemberGender;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  zipCode: string;

  @Column({ type: 'date', nullable: true })
  joinDate: Date;

  @Column({ type: 'date', nullable: true })
  lastVisit: Date;

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'boolean', default: false })
  hasMembership: boolean;

  @Column({ type: 'boolean', default: false })
  hasPendingPayment: boolean;

  @Column({ type: 'boolean', default: false })
  hasRegistrationPaymentPending: boolean;

  @Column({ type: 'boolean', default: false })
  hasMembershipPaymentPending: boolean;

  @Column({ type: 'longtext', nullable: true })
  fingerprints?: string; // JSON con información de huellas dactilares

  @OneToMany(() => MemberMembership, (membership) => membership.member)
  memberships: MemberMembership[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
