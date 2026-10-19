import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NotificationOutbox,
  NotificationChannel,
  NotificationOutboxType,
  NotificationOutboxStatus,
  NotificationPriority,
} from './entities/notification-outbox.entity';
import {
  EnqueueEmailDto,
  EnqueueWhatsappDto,
  EnqueueWhatsappPdfDto,
  GetOutboxQueryDto,
} from './dto/enqueue-notification.dto';

export function isDeliverableEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (
    clean.endsWith('.local') ||
    clean.endsWith('.test') ||
    clean.includes('@gym.local') ||
    clean.includes('example.com') ||
    !clean.includes('@') ||
    !clean.includes('.')
  ) {
    return false;
  }
  return true;
}

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepository: Repository<NotificationOutbox>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Encola un correo electrónico en la bandeja de salida (Outbox)
   */
  async enqueueEmail(dto: EnqueueEmailDto): Promise<NotificationOutbox> {
    const cleanRecipient = dto.recipient.trim().toLowerCase();

    // Bloquear correos a dominios locales (.local), de prueba o inválidos
    if (!isDeliverableEmail(cleanRecipient)) {
      this.logger.warn(`[Outbox] 🛑 Omitiendo correo a dirección no entregable / ficticia: ${cleanRecipient}`);
      const skippedItem = this.outboxRepository.create({
        channel: NotificationChannel.EMAIL,
        type: NotificationOutboxType.TEXT,
        recipient: cleanRecipient,
        recipientName: dto.recipientName,
        subject: dto.subject,
        content: dto.content || dto.subject,
        htmlContent: dto.htmlContent,
        priority: dto.priority ?? NotificationPriority.NORMAL,
        status: NotificationOutboxStatus.SENT,
        errorMessage: 'Omitido automáticamente: dirección local o ficticia (.local)',
        processedAt: new Date(),
      });
      return await this.outboxRepository.save(skippedItem);
    }

    const outboxItem = this.outboxRepository.create({
      channel: NotificationChannel.EMAIL,
      type: NotificationOutboxType.TEXT,
      recipient: cleanRecipient,
      recipientName: dto.recipientName,
      subject: dto.subject,
      content: dto.content || dto.subject,
      htmlContent: dto.htmlContent,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      nextAttemptAt: dto.scheduledFor ?? new Date(),
      status: NotificationOutboxStatus.PENDING,
      payloadJson: dto.attachments ? JSON.stringify(dto.attachments) : undefined,
      metadataJson: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
    });

    const saved = await this.outboxRepository.save(outboxItem);
    this.logger.debug(`[Outbox] 📥 Correo encolado para ${saved.recipient} (ID: ${saved.id})`);
    this.eventEmitter.emit('outbox.enqueued', { id: saved.id, channel: saved.channel });
    return saved;
  }

  /**
   * Encola un mensaje de texto de WhatsApp en la bandeja de salida (Outbox)
   */
  async enqueueWhatsapp(dto: EnqueueWhatsappDto): Promise<NotificationOutbox> {
    const outboxItem = this.outboxRepository.create({
      channel: NotificationChannel.WHATSAPP,
      type: NotificationOutboxType.TEXT,
      recipient: dto.recipient.trim(),
      recipientName: dto.recipientName,
      content: dto.content,
      priority: dto.priority ?? NotificationPriority.NORMAL,
      nextAttemptAt: dto.scheduledFor ?? new Date(),
      status: NotificationOutboxStatus.PENDING,
      metadataJson: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
    });

    const saved = await this.outboxRepository.save(outboxItem);
    this.logger.debug(`[Outbox] 📥 WhatsApp encolado para ${saved.recipient} (ID: ${saved.id})`);
    this.eventEmitter.emit('outbox.enqueued', { id: saved.id, channel: saved.channel });
    return saved;
  }

  /**
   * Encola un documento PDF para envío por WhatsApp
   */
  async enqueueWhatsappPdf(dto: EnqueueWhatsappPdfDto): Promise<NotificationOutbox> {
    const payload = {
      filename: dto.filename,
      base64Data: dto.base64Data,
      caption: dto.caption || dto.filename,
    };

    const outboxItem = this.outboxRepository.create({
      channel: NotificationChannel.WHATSAPP,
      type: NotificationOutboxType.PDF,
      recipient: dto.recipient.trim(),
      content: dto.caption || `Documento adjunto: ${dto.filename}`,
      payloadJson: JSON.stringify(payload),
      priority: dto.priority ?? NotificationPriority.NORMAL,
      nextAttemptAt: dto.scheduledFor ?? new Date(),
      status: NotificationOutboxStatus.PENDING,
      metadataJson: dto.metadata ? JSON.stringify(dto.metadata) : undefined,
    });

    const saved = await this.outboxRepository.save(outboxItem);
    this.logger.debug(`[Outbox] 📥 WhatsApp PDF encolado para ${saved.recipient} (ID: ${saved.id})`);
    this.eventEmitter.emit('outbox.enqueued', { id: saved.id, channel: saved.channel });
    return saved;
  }

  /**
   * Obtiene estadísticas de la cola de salida
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    whatsappPending: number;
    emailPending: number;
  }> {
    const [pending, processing, sent, failed, whatsappPending, emailPending] = await Promise.all([
      this.outboxRepository.count({ where: { status: NotificationOutboxStatus.PENDING } }),
      this.outboxRepository.count({ where: { status: NotificationOutboxStatus.PROCESSING } }),
      this.outboxRepository.count({ where: { status: NotificationOutboxStatus.SENT } }),
      this.outboxRepository.count({ where: { status: NotificationOutboxStatus.FAILED } }),
      this.outboxRepository.count({
        where: {
          channel: NotificationChannel.WHATSAPP,
          status: NotificationOutboxStatus.PENDING,
        },
      }),
      this.outboxRepository.count({
        where: {
          channel: NotificationChannel.EMAIL,
          status: NotificationOutboxStatus.PENDING,
        },
      }),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      whatsappPending,
      emailPending,
    };
  }

  /**
   * Consulta historial y estado de mensajes en la bandeja
   */
  async getOutboxHistory(query: GetOutboxQueryDto): Promise<{ items: NotificationOutbox[]; total: number }> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));

    const qb = this.outboxRepository.createQueryBuilder('o');

    if (query.channel) {
      qb.andWhere('o.channel = :channel', { channel: query.channel });
    }

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere('(o.recipient LIKE :s OR o.recipientName LIKE :s OR o.subject LIKE :s)', {
        s: `%${query.search}%`,
      });
    }

    qb.orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Reintenta un mensaje que quedó en estado fallido
   */
  async retryMessage(id: string): Promise<NotificationOutbox> {
    const item = await this.outboxRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Mensaje de Outbox no encontrado');
    }

    item.status = NotificationOutboxStatus.PENDING;
    item.retryCount = 0;
    item.nextAttemptAt = new Date();
    item.errorMessage = undefined;

    const saved = await this.outboxRepository.save(item);
    this.eventEmitter.emit('outbox.enqueued', { id: saved.id, channel: saved.channel });
    return saved;
  }

  /**
   * Cancela un mensaje pendiente o fallido
   */
  async cancelMessage(id: string): Promise<void> {
    const item = await this.outboxRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Mensaje de Outbox no encontrado');
    }

    await this.outboxRepository.delete(id);
  }

  /**
   * Verifica si ya se envió o encoló una notificación reciente con la misma fuente y miembro
   */
  async hasRecentNotification(source: string, memberId: string, withinDays: number = 4): Promise<boolean> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - withinDays);
    const count = await this.outboxRepository
      .createQueryBuilder('o')
      .where('o.createdAt >= :sinceDate', { sinceDate })
      .andWhere('o.metadataJson LIKE :metaSource', { metaSource: `%"source":"${source}"%` })
      .andWhere('o.metadataJson LIKE :metaMember', { metaMember: `%"memberId":"${memberId}"%` })
      .getCount();
    return count > 0;
  }
}
