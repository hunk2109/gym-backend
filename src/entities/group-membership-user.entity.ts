import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { GroupMembership } from './group-membership.entity';
import { User } from './user.entity';

export enum GroupMembershipUserStatus {
  ACTIVE = 'active',
  REMOVED = 'removed',
  INACTIVE = 'inactive',
}

@Entity('group_membership_users')
export class GroupMembershipUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  groupMembershipId: string;

  @ManyToOne(() => GroupMembership, (gm) => gm.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupMembershipId' })
  groupMembership: GroupMembership;

  @Column({ type: 'varchar' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: GroupMembershipUserStatus,
    default: GroupMembershipUserStatus.ACTIVE,
  })
  status: GroupMembershipUserStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  addedAt: Date;
}
