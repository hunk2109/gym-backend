import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Employee } from './employee.entity';

export enum ClassLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('gym_classes')
export class GymClass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Employee, { eager: true, onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'trainerId' })
  trainer: Employee;

  @Column({ type: 'uuid', nullable: true })
  trainerId: string;

  @Column({ type: 'varchar' })
  schedule: string; // e.g., "Monday, Wednesday, Friday 18:00-19:00"

  @Column({ type: 'int' })
  capacity: number;

  @Column({ type: 'int', default: 0 })
  enrolled: number;

  @Column({
    type: 'enum',
    enum: ClassLevel,
    default: ClassLevel.INTERMEDIATE,
  })
  level: ClassLevel;

  @Column({ type: 'varchar', nullable: true })
  room: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany('ClassEnrollment', 'gymClass', { cascade: true })
  enrollments: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
