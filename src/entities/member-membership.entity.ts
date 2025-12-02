import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Membership } from './membership.entity';

@Entity('member_memberships')
export class MemberMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'uuid' })
  memberId: string;

  @ManyToOne(() => Membership, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'membershipId' })
  membership: Membership;

  @Column({ type: 'uuid' })
  membershipId: string;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountPaid: number;

  @Column({ type: 'date', nullable: true })
  paymentDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
