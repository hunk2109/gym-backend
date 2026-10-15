import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import {
  NotificationOutbox,
  NotificationChannel,
  NotificationOutboxType,
  NotificationOutboxStatus,
} from './entities/notification-outbox.entity';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { EmailService } from '../email-settings/email.service';

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private lastWhatsappWarnTime = 0;

  constructor(
    @InjectRepository(NotificationOutbox)
    private readonly outboxRepository: Repository<NotificationOutbox>,
    private readonly whatsappService: WhatsappService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Tarea programada: Revisa la bandeja de salida cada 5 segundos
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async handleScheduledProcessing() {
    await this.processQueue();
  }

  /**
   * Evento: Cuando WhatsApp se conecta, procesa inmediatamente los mensajes pendientes
   */
  @OnEvent('whatsapp.ready')
  async handleWhatsappReady() {
    this.logger.log('🚀 WhatsApp conectado: Despachando mensajes acumulados en Outbox...');
    await this.processQueue();
  }

  /**
   * Evento: Cuando entra un nuevo mensaje de alta prioridad
   */
  @OnEvent('outbox.enqueued')
  async handleNewMessage(data: { id: string; channel: NotificationChannel }) {
    // Si no está procesando, inicia inmediatamente
    if (!this.isProcessing) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Motor de procesamiento de la cola Outbox
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    try {
      const isWhatsappOnline = this.whatsappService.isConnected();
      const now = new Date();

      // Construir consulta: si WhatsApp está desconectado, solo procesamos correos
      // para que la falta de WhatsApp nunca bloquee la entrega de correos electrónicos.
      const qb = this.outboxRepository.createQueryBuilder('o')
        .where('o.status = :status', { status: NotificationOutboxStatus.PENDING })
        .andWhere('o.nextAttemptAt <= :now', { now });

      if (!isWhatsappOnline) {
        qb.andWhere('o.channel = :channel', { channel: NotificationChannel.EMAIL });

        // Aviso throttled cada 60s si hay mensajes de WhatsApp en espera
        const nowMs = Date.now();
        if (nowMs - this.lastWhatsappWarnTime > 60000) {
          const pendingWhatsappCount = await this.outboxRepository.count({
            where: {
              channel: NotificationChannel.WHATSAPP,
              status: NotificationOutboxStatus.PENDING,
            },
          });
          if (pendingWhatsappCount > 0) {
            this.logger.warn(`[Outbox] ⏳ ${pendingWhatsappCount} mensajes de WhatsApp en cola esperando conexión de WhatsApp`);
            this.lastWhatsappWarnTime = nowMs;
          }
        }
      }

      const batch = await qb
        .orderBy('o.priority', 'ASC')
        .addOrderBy('o.nextAttemptAt', 'ASC')
        .take(10)
        .getMany();

      if (batch.length === 0) {
        return;
      }

      for (const item of batch) {
        await this.processItem(item);
      }
    } catch (error) {
      this.logger.error('Error durante el procesamiento del Outbox:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Procesa un único elemento del Outbox
   */
  private async processItem(item: NotificationOutbox): Promise<void> {
    // 1. Marcar como PROCESSING para evitar que otro worker o tick lo tome
    item.status = NotificationOutboxStatus.PROCESSING;
    await this.outboxRepository.save(item);

    try {
      if (item.channel === NotificationChannel.EMAIL) {
        await this.deliverEmail(item);
      } else if (item.channel === NotificationChannel.WHATSAPP) {
        await this.deliverWhatsapp(item);
      } else {
        throw new Error(`Canal desconocido: ${item.channel}`);
      }

      // Éxito: Marcar como SENT
      item.status = NotificationOutboxStatus.SENT;
      item.processedAt = new Date();
      item.errorMessage = undefined;
      await this.outboxRepository.save(item);
      this.logger.log(`[Outbox] ✅ Entregado (${item.channel}): ${item.recipient} (ID: ${item.id})`);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.logger.warn(`[Outbox] ⚠️ Fallo al enviar a ${item.recipient} (${item.channel}): ${errMsg}`);

      item.retryCount += 1;
      item.errorMessage = errMsg;

      if (item.retryCount >= item.maxRetries) {
        item.status = NotificationOutboxStatus.FAILED;
        this.logger.error(`[Outbox] ❌ Agotados reintentos (${item.maxRetries}) para mensaje ${item.id}`);
      } else {
        item.status = NotificationOutboxStatus.PENDING;
        // Backoff exponencial: 30s, 60s, 120s...
        const delaySeconds = Math.pow(2, item.retryCount) * 30;
        item.nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);
        this.logger.log(`[Outbox] 🔄 Reintento #${item.retryCount} programado para dentro de ${delaySeconds}s (ID: ${item.id})`);
      }

      await this.outboxRepository.save(item);
    }
  }

  /**
   * Despacha un correo electrónico usando EmailService
   */
  private async deliverEmail(item: NotificationOutbox): Promise<void> {
    let attachments: any[] | undefined;
    if (item.payloadJson) {
      try {
        attachments = JSON.parse(item.payloadJson);
      } catch (_) {}
    }

    await this.emailService.sendEmail({
      recipientEmail: item.recipient,
      recipientName: item.recipientName,
      subject: item.subject || 'Notificación',
      htmlContent: item.htmlContent,
      plainTextContent: item.content,
      attachments,
    });
  }

  /**
   * Despacha un mensaje de WhatsApp usando WhatsappService
   */
  private async deliverWhatsapp(item: NotificationOutbox): Promise<void> {
    if (!this.whatsappService.isConnected()) {
      throw new Error('WhatsApp no está conectado');
    }

    if (item.type === NotificationOutboxType.PDF && item.payloadJson) {
      const payload = JSON.parse(item.payloadJson);
      await this.whatsappService.sendBase64Pdf(
        item.recipient,
        payload.base64Data,
        payload.filename || 'documento.pdf',
        payload.caption || item.content || 'Documento adjunto',
      );
    } else {
      await this.whatsappService.sendMessage(item.recipient, item.content);
    }

    // Pausa preventiva de 1.2s a 2s para evitar bloqueos por envíos masivos
    const delay = Math.floor(1200 + Math.random() * 800);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
