import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EmailTemplate } from './email-template.entity';

export enum EmailStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum EmailType {
  BIRTHDAY = 'BIRTHDAY',
  PAYMENT_REMINDER = 'PAYMENT_REMINDER',
  MEMBERSHIP_EXPIRY = 'MEMBERSHIP_EXPIRY',
  BULK_PROMOTION = 'BULK_PROMOTION',
  CUSTOM = 'CUSTOM',
}

@Entity('email_logs')
export class EmailLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  templateId: string;

  @ManyToOne(() => EmailTemplate, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template: EmailTemplate;

  @Column()
  recipientEmail: string;

  @Column({ nullable: true })
  recipientName: string;

  @Column({ nullable: true })
  memberId: string;

  @Column()
  subject: string;

  @Column({ type: 'longtext' })
  htmlContent: string;

  @Column({ type: 'enum', enum: EmailStatus, default: EmailStatus.PENDING })
  status: EmailStatus;

  @Column({ type: 'enum', enum: EmailType, default: EmailType.CUSTOM })
  emailType: EmailType;

  @Column({ nullable: true })
  messageId: string;

  @Column({ nullable: true, type: 'longtext' })
  errorMessage: string;

  @Column({ nullable: true })
  sentAt: Date;

  @Column({ nullable: true })
  failedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
