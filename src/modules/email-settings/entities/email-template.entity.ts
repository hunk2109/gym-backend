import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EmailTriggerType {
  BIRTHDAY = 'BIRTHDAY',
  ANNIVERSARY = 'ANNIVERSARY',
  PROMOTION = 'PROMOTION',
  MANUAL = 'MANUAL',
}

@Entity('email_templates')
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: EmailTriggerType })
  triggerType: EmailTriggerType;

  @Column()
  subject: string;

  @Column({ type: 'longtext' })
  htmlContent: string;

  @Column({ type: 'longtext', nullable: true })
  plainTextContent: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  includeDiscountCode: boolean;

  @Column({ nullable: true })
  discountCodePercentage: number;

  @Column({ nullable: true })
  discountCodeDaysValid: number;

  @Column({ nullable: true })
  maxUsesPerCode: number;

  @Column({ 
    type: 'json', 
    nullable: true,
    comment: 'Variables disponibles: {{firstName}}, {{lastName}}, {{email}}, {{discount}}, {{expiryDate}}'
  })
  availableVariables: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
