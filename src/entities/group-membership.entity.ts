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
import { Membership } from './membership.entity';
import { User } from './user.entity';
import { GroupMembershipUser } from './group-membership-user.entity';

export enum GroupMembershipStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('group_memberships')
export class GroupMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar' })
  membershipId: string;

  @ManyToOne(() => Membership)
  @JoinColumn({ name: 'membershipId' })
  membership: Membership;

  @Column({ type: 'varchar' })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @Column({ type: 'int' })
  maxMembers: number;

  @Column({
    type: 'enum',
    enum: GroupMembershipStatus,
    default: GroupMembershipStatus.ACTIVE,
  })
  status: GroupMembershipStatus;

  @Column({ type: 'date' })
  startDate: Date;

  @Column({ type: 'date' })
  endDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => GroupMembershipUser, (gmu) => gmu.groupMembership, { eager: true })
  members: GroupMembershipUser[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get currentMembers(): number {
    return this.members?.length || 0;
  }

  get availableSlots(): number {
    return Math.max(0, this.maxMembers - this.currentMembers);
  }

  get isPaid(): boolean {
    return this.paidAmount >= this.totalPrice;
  }

  get isActive(): boolean {
    const now = new Date();
    return (
      this.status === GroupMembershipStatus.ACTIVE &&
      now >= this.startDate &&
      now <= this.endDate
    );
  }
}
