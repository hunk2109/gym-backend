import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailLog, EmailType, EmailStatus } from './entities/email-log.entity';

interface DuplicateCheckOptions {
  emailType: EmailType;
  memberId?: string;
  recipientEmail: string;
  minutesThreshold?: number; // Período en minutos para considerar duplicado
}

@Injectable()
export class EmailDuplicateCheckerService {
  private readonly logger = new Logger(EmailDuplicateCheckerService.name);

  constructor(
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
  ) {}

  /**
   * Verifica si un email similar ya fue enviado recientemente
   * @returns true si se encontró un duplicado, false si es seguro enviar
   */
  async isDuplicate(options: DuplicateCheckOptions): Promise<boolean> {
    const {
      emailType,
      memberId,
      recipientEmail,
      minutesThreshold = 30, // Por defecto 30 minutos
    } = options;

    try {
      const thresholdDate = new Date();
      thresholdDate.setMinutes(thresholdDate.getMinutes() - minutesThreshold);

      // Buscar emails del mismo tipo, al mismo miembro/email y enviados recientemente
      const query = this.emailLogRepository
        .createQueryBuilder('log')
        .where('log.emailType = :emailType', { emailType })
        .andWhere('log.status = :status', { status: EmailStatus.SENT })
        .andWhere('log.recipientEmail = :recipientEmail', { recipientEmail })
        .andWhere('log.createdAt > :thresholdDate', { thresholdDate });

      if (memberId) {
        query.andWhere('log.memberId = :memberId', { memberId });
      }

      query.orderBy('log.createdAt', 'DESC').take(1);

      const lastEmail = await query.getOne();

      if (lastEmail) {
        this.logger.warn(
          `⚠️ Email duplicado detectado: ${emailType} a ${recipientEmail} hace ${this.getMinutesDifference(lastEmail.createdAt)} minutos`,
        );
        return true;
      }

      this.logger.log(`✅ Email permitido: ${emailType} a ${recipientEmail}`);
      return false;
    } catch (error) {
      this.logger.error(`❌ Error al verificar duplicados: ${error.message}`);
      return false; // Por seguridad, permitir envío si hay error
    }
  }

  /**
   * Obtiene el último email de un tipo enviado a un miembro
   */
  async getLastEmail(
    emailType: EmailType,
    memberId: string,
  ): Promise<EmailLog | null> {
    return this.emailLogRepository.findOne({
      where: {
        emailType,
        memberId,
        status: EmailStatus.SENT,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Calcula minutos desde hace un email fue enviado
   */
  private getMinutesDifference(date: Date): number {
    const now = new Date();
    return Math.round((now.getTime() - date.getTime()) / (1000 * 60));
  }

  /**
   * Limpia logs antiguos (más de 90 días)
   */
  async cleanOldLogs(daysThreshold: number = 90): Promise<void> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

      const result = await this.emailLogRepository.delete({
        createdAt: this.emailLogRepository
          .createQueryBuilder('log')
          .where('log.createdAt < :date', { date: thresholdDate })
          .getQuery(),
      } as any);

      this.logger.log(`🧹 Limpiados ${result.affected} logs de email antiguos`);
    } catch (error) {
      this.logger.error(`❌ Error al limpiar logs: ${error.message}`);
    }
  }
}
