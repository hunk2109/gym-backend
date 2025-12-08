import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from 'typeorm';

export type CronExecutionStatus = 'success' | 'error' | 'running';

@Entity('cron_execution_log')
@Index('idx_cronName', ['cronName'])
@Index('idx_status', ['status'])
@Index('idx_executedAt', ['executedAt'])
export class CronExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  cronName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'success',
  })
  status: CronExecutionStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'int', nullable: true })
  executionTimeMs?: number;

  @Column({ type: 'int', nullable: true })
  itemsProcessed?: number;

  @CreateDateColumn()
  executedAt: Date;
}
