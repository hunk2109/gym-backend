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

  @Column({ type: 'int', unique: true, nullable: true })
  zkUid?: number;

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



  @Column({ type: 'longtext', nullable: true })
  fingerprints?: string; // JSON con información de huellas dactilares

  @Column({ type: 'varchar', length: 36, nullable: true })
  registrationPaymentId?: string; // ID del pago de inscripción

  @OneToMany(() => MemberMembership, (membership) => membership.member)
  memberships: MemberMembership[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  creditBalance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
