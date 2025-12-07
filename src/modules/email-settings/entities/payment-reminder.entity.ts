import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Member } from '../../../entities/member.entity';

export enum ReminderFrequency {
  DAILY = 'DAILY',
  THREE_DAYS = 'THREE_DAYS',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
}

export enum ReminderType {
  DUE_DATE = 'DUE_DATE', // Recordatorio en la fecha de vencimiento
  BEFORE_DUE = 'BEFORE_DUE', // Recordatorio X días antes del vencimiento
  OVERDUE = 'OVERDUE', // Recordatorio de pago vencido
}

@Entity('payment_reminders')
export class PaymentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  memberId: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member: Member;

  @Column({ type: 'enum', enum: ReminderType })
  type: ReminderType;

  @Column({ type: 'enum', enum: ReminderFrequency })
  frequency: ReminderFrequency;

  @Column()
  daysBeforeDue: number; // Para BEFORE_DUE: cuántos días antes enviar recordatorio

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastSentAt: Date;

  @Column({ nullable: true })
  nextSendAt: Date;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ nullable: true })
  lastErrorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
