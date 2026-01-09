import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';

export enum AttendanceStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('attendances')
export class Attendance {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'varchar' })
  memberId: string;

  @Column({ type: 'datetime' })
  visitDate: Date;

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.ACCEPTED,
  })
  status: AttendanceStatus;

  @Column({ type: 'varchar', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
