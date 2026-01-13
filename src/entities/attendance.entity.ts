import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Member } from './member.entity';
import { Employee } from './employee.entity';

export enum AttendanceStatus {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Entity('attendances')
export class Attendance {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'memberId' })
  member?: Member;

  @Column({ type: 'varchar', nullable: true })
  memberId?: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'employeeId' })
  employee?: Employee;

  @Column({ type: 'varchar', nullable: true })
  employeeId?: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  attendanceType: 'member' | 'employee'; // Tipo de persona que asistió

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

