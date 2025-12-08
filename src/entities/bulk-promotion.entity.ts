import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Member } from './member.entity';

@Entity('bulk_promotions')
export class BulkPromotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  htmlContent: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SCHEDULED';

  @Column({ type: 'int', default: 0 })
  totalRecipients: number;

  @Column({ type: 'int', default: 0 })
  sentCount: number;

  @Column({ type: 'int', default: 0 })
  failedCount: number;

  @Column({ type: 'boolean', default: false })
  sendToAll: boolean;

  @ManyToMany(() => Member, { eager: false })
  @JoinTable({
    name: 'bulk_promotion_members',
    joinColumn: { name: 'promotionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'memberId', referencedColumnName: 'id' },
  })
  members: Member[];

  @Column({ type: 'datetime', nullable: true })
  scheduledFor: Date;

  @Column({ type: 'datetime', nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
