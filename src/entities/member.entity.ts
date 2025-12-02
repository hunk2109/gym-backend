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
import { User } from './user.entity';

export enum MemberGender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
