import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';

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

  @Column({ type: 'varchar', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
