import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EmailProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  SMTP = 'SMTP',
}

@Entity('email_configs')
export class EmailConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EmailProvider })
  provider: EmailProvider;

  @Column()
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  clientSecret: string;

  @Column({ nullable: true })
  refreshToken: string;

  @Column({ nullable: true })
  smtpHost: string;

  @Column({ nullable: true, type: 'int' })
  smtpPort: number;

  @Column({ nullable: true })
  smtpUser: string;

  @Column({ nullable: true })
  smtpPassword: string;

  @Column({ default: false })
  useSSL: boolean;

  @Column({ default: false })
  useTLS: boolean;

  @Column({ nullable: true })
  senderName: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verificationError: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
