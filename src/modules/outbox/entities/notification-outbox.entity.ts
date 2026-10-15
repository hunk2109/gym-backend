import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
}

export enum NotificationOutboxType {
  TEXT = 'text',
  TEMPLATE = 'template',
  PDF = 'pdf',
}

export enum NotificationOutboxStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum NotificationPriority {
  URGENT = 1, // Recibos de pago, verificaciones inmediatas
  HIGH = 2,   // Alertas de corte / vencimiento
  NORMAL = 3, // Recordatorios programados, cumpleaños
  LOW = 4,    // Campañas masivas de marketing
}

@Entity('notification_outbox')
@Index('idx_outbox_queue', ['status', 'channel', 'nextAttemptAt', 'priority'])
@Index('idx_outbox_recipient', ['recipient'])
@Index('idx_outbox_status', ['status'])
export class NotificationOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: NotificationOutboxType,
    default: NotificationOutboxType.TEXT,
  })
  type: NotificationOutboxType;

  @Column({ type: 'varchar', length: 150 })
  recipient: string; // Correo o número telefónico

  @Column({ type: 'varchar', length: 150, nullable: true })
  recipientName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject?: string; // Asunto (Email) o encabezado

  @Column({ type: 'text' })
  content: string; // Texto plano del mensaje

  @Column({ type: 'longtext', nullable: true })
  htmlContent?: string; // Contenido enriquecido HTML (Email)

  @Column({ type: 'longtext', nullable: true })
  payloadJson?: string; // Adjuntos base64, nombre de archivo o variables

  @Column({ type: 'text', nullable: true })
  metadataJson?: string; // Origen: { source: 'payment', paymentId: '...', memberId: '...' }

  @Column({
    type: 'enum',
    enum: NotificationOutboxStatus,
    default: NotificationOutboxStatus.PENDING,
  })
  status: NotificationOutboxStatus;

  @Column({
    type: 'int',
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  nextAttemptAt: Date;

  @Column({ type: 'datetime', nullable: true })
  processedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
