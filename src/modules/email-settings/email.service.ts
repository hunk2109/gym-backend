import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import {
  EmailConfig,
  EmailTemplate,
  EmailLog,
  EmailProvider,
  EmailStatus,
} from './entities';
import { SendEmailDto } from './dto';
import { EmailTemplateBuilder } from './email-template.builder';

import { User } from '../../entities/user.entity';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { isDeliverableEmail } from '../outbox/outbox.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    @InjectRepository(EmailConfig)
    private emailConfigRepository: Repository<EmailConfig>,
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
    @InjectRepository(EmailLog)
    private emailLogRepository: Repository<EmailLog>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private whatsappService: WhatsappService,
  ) {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transportador de nodemailer basado en la configuración activa
   */
  public async initializeTransporter() {
    try {
      const activeConfig = await this.emailConfigRepository.findOne({
        where: { isActive: true },
      });

      if (!activeConfig) {
        this.logger.warn('No active email configuration found');
        this.transporter = undefined as any;
        return;
      }

      this.transporter = await this.createTransporter(activeConfig);
      this.logger.log(`Email transporter initialized with provider: ${activeConfig.provider}`);
    } catch (error) {
      this.logger.error('Failed to initialize email transporter', error);
    }
  }

  /**
   * Crea un transportador nodemailer según el proveedor
   */
  private async createTransporter(config: EmailConfig): Promise<nodemailer.Transporter> {
    switch (config.provider) {
      case EmailProvider.GOOGLE:
        if (config.clientId && config.clientSecret && config.refreshToken) {
          return nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user: config.email,
              clientId: config.clientId,
              clientSecret: config.clientSecret,
              refreshToken: config.refreshToken,
            },
          });
        }
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.email,
            pass: config.password,
          },
        });

      case EmailProvider.MICROSOFT:
        return nodemailer.createTransport({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            user: config.email,
            pass: config.password,
          },
        });

      case EmailProvider.SMTP:
        return nodemailer.createTransport({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.useSSL || config.smtpPort === 465,
          auth: {
            user: config.smtpUser || config.email,
            pass: config.smtpPassword || config.password,
          },
        });

      default:
        throw new BadRequestException(`Unsupported email provider: ${config.provider}`);
    }
  }

  /**
   * Envía un correo electrónico
   */
  async sendEmail(dto: SendEmailDto): Promise<EmailLog> {
    try {
      if (!isDeliverableEmail(dto.recipientEmail)) {
        this.logger.warn(`[EmailService] 🛑 Envío de correo cancelado: dirección local/ficticia ignorada (${dto.recipientEmail})`);
        const skippedLog = this.emailLogRepository.create({
          templateId: dto.templateId,
          recipientEmail: dto.recipientEmail,
          recipientName: dto.recipientName,
          memberId: dto.memberId,
          subject: dto.subject || 'Sin asunto',
          htmlContent: dto.htmlContent || '',
          status: EmailStatus.FAILED,
          errorMessage: 'Omitido automáticamente: dirección local o ficticia (.local)',
          failedAt: new Date(),
        });
        return await this.emailLogRepository.save(skippedLog);
      }

      if (!this.transporter) {
        await this.initializeTransporter();
      }

      if (!this.transporter) {
        throw new BadRequestException('Email service not configured');
      }

      const config = await this.emailConfigRepository.findOne({
        where: { isActive: true },
      });

      if (!config) {
        throw new BadRequestException('No active email configuration found');
      }

      let htmlContent = dto.htmlContent || '';
      let plainTextContent = dto.plainTextContent || '';
      let subject = dto.subject || '';

      // Si se proporciona templateId, usar contenido de plantilla
      if (dto.templateId) {
        const template = await this.emailTemplateRepository.findOne({
          where: { id: dto.templateId, isActive: true },
        });

        if (!template) {
          throw new BadRequestException('Email template not found or inactive');
        }

        htmlContent = template.htmlContent;
        plainTextContent = template.plainTextContent || '';
        subject = template.subject;
      }

      // Reemplazar variables en contenido
      if (dto.variables) {
        htmlContent = this.replaceVariables(htmlContent, dto.variables);
        plainTextContent = this.replaceVariables(plainTextContent, dto.variables);
        subject = this.replaceVariables(subject, dto.variables);
      }

      // Enviar correo
      const mailOptions: any = {
        from: `${config.senderName || 'Gym Manager'} <${config.email}>`,
        to: dto.recipientEmail,
        subject,
        html: htmlContent,
        text: plainTextContent,
      };

      if (dto.attachments && dto.attachments.length > 0) {
        mailOptions.attachments = dto.attachments.map((att: any) => {
          if (att && typeof att.content === 'string') {
            return {
              ...att,
              content: Buffer.from(att.content, att.encoding === 'utf8' || att.encoding === 'utf-8' ? 'utf8' : 'base64'),
            };
          }
          return att;
        });
      }

      const info = await this.transporter.sendMail(mailOptions);

      // Attempt to send via WhatsApp if possible
      try {
        let phoneNumber: string | undefined;

        // Try to get phone from Member ID if provided
        if (dto.memberId) {
          const userWithPhone = await this.userRepository.createQueryBuilder('u')
            .innerJoin('u.member', 'm')
            .where('m.id = :memberId', { memberId: dto.memberId })
            .select(['u.phone'])
            .getOne();
          if (userWithPhone?.phone) {
            phoneNumber = userWithPhone.phone;
          }
        } 
        
        // If no memberId or no phone found, try by email
        if (!phoneNumber && dto.recipientEmail) {
          const userWithPhone = await this.userRepository.findOne({
            where: { email: dto.recipientEmail },
            select: ['phone'],
          });
          if (userWithPhone?.phone) {
            phoneNumber = userWithPhone.phone;
          }
        }

        if (phoneNumber) {
          // Si el correo tiene adjuntos (ej. reportes manuales), no enviamos WhatsApp automático
          // porque el servicio correspondiente (CashRegister o DailySummary) ya lo envía directamente.
          if (dto.attachments && dto.attachments.length > 0) {
            this.logger.log(`Skipping auto WhatsApp send for ${phoneNumber} because email has attachments.`);
          } else {
            // Si el WhatsApp está conectado, enviar el PDF
            const statusInfo = this.whatsappService.getStatus();
            if (statusInfo.status === 'CONNECTED') {
              const fallbackText = `¡Hola! Te hemos enviado una notificación importante de Gym Manager. Adjuntamos el documento detallado.\n\nAsunto: ${subject}`;
              await this.whatsappService.sendHtmlAsPdf(phoneNumber, htmlContent, fallbackText);
            } else {
              this.logger.warn(`WhatsApp no está conectado. No se pudo enviar el PDF a ${phoneNumber}`);
            }
          }
        }
      } catch (waError) {
        this.logger.error(`Error sending WhatsApp notification along with email to ${dto.recipientEmail}: ${waError.message}`);
        // No lanzamos error para no interrumpir el flujo de correo
      }

      // Registrar envío exitoso
      const emailLog = this.emailLogRepository.create({
        templateId: dto.templateId,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        memberId: dto.memberId,
        subject,
        htmlContent,
        status: EmailStatus.SENT,
        messageId: info.messageId,
        sentAt: new Date(),
        metadata: {
          provider: config.provider,
          response: info.response,
        },
      });

      await this.emailLogRepository.save(emailLog);
      this.logger.log(`Email sent to ${dto.recipientEmail} (ID: ${emailLog.id})`);

      return emailLog;
    } catch (error) {
      this.logger.error(`Failed to send email to ${dto.recipientEmail}`, error);

      // Registrar fallo
      const emailLog = this.emailLogRepository.create({
        templateId: dto.templateId,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        memberId: dto.memberId,
        subject: dto.subject,
        htmlContent: dto.htmlContent,
        status: EmailStatus.FAILED,
        errorMessage: error.message,
        failedAt: new Date(),
      });

      await this.emailLogRepository.save(emailLog);

      throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Reemplaza variables en el contenido (ej: {{firstName}} → Juan)
   */
  private replaceVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, value || '');
    }
    return result;
  }

  /**
   * Verifica la configuración de correo intentando enviar un correo de prueba
   */
  async verifyEmailConfig(configId: string, testEmail?: string): Promise<boolean> {
    try {
      const config = await this.emailConfigRepository.findOne({
        where: { id: configId },
      });

      if (!config) {
        throw new BadRequestException('Email configuration not found');
      }

      const transporter = await this.createTransporter(config);

      await transporter.verify();
      this.logger.log(`Email configuration verified for ${config.email}`);

      // Marcar como verificado
      config.isVerified = true;
      config.verificationError = undefined as any;
      await this.emailConfigRepository.save(config);

      // Reinicializar transportador
      await this.initializeTransporter();

      // Si se proporcionó un correo para probar envío real, enviarlo ahora
      if (testEmail && testEmail.trim().length > 0) {
        try {
          await transporter.sendMail({
            from: `${config.senderName || 'Gym Manager'} <${config.email}>`,
            to: testEmail.trim(),
            subject: 'Verificación de Correo - Gym Manager',
            text: `Hola, esta es una verificación de correo exitosa desde Gym Manager (${config.email}).`,
            html: `<div style="font-family:sans-serif;padding:24px;border:1px solid #e0e0e0;border-radius:10px;max-width:500px;background:#ffffff;color:#333333;">` +
                  `<h2 style="color:#4CAF50;margin-top:0;">✓ Verificación Exitosa</h2>` +
                  `<p>El servidor de correo saliente de <b>Gym Manager</b> ha sido configurado y verificado correctamente.</p>` +
                  `<p><b>Remitente Configurado:</b> ${config.email}<br/><b>Proveedor:</b> ${config.provider}</p>` +
                  `<p style="font-size:12px;color:#777;">Ya puedes enviar facturas, recibos, recordatorios y alertas por correo a tus socios.</p>` +
                  `</div>`,
          });
          this.logger.log(`Test verification email sent to ${testEmail}`);
        } catch (sendErr) {
          this.logger.warn(`Transporter verified successfully, but sending test email failed: ${sendErr.message}`);
        }
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to verify email config`, error);

      // Guardar error de verificación
      const config = await this.emailConfigRepository.findOne({
        where: { id: configId },
      });
      if (config) {
        config.isVerified = false;
        config.verificationError = error.message;
        await this.emailConfigRepository.save(config);
      }

      throw new BadRequestException(`Email verification failed: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las plantillas activas
   */
  async getActiveTemplates() {
    return this.emailTemplateRepository.find({
      where: { isActive: true },
    });
  }

  /**
   * Obtiene el historial de envíos
   */
  async getEmailLogs(limit: number = 50, offset: number = 0) {
    const [logs, total] = await this.emailLogRepository.findAndCount({
      relations: ['template'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return { logs, total };
  }

  /**
   * Envía un email directo sin plantilla (para recordatorios de pago)
   */
  async sendEmailDirect(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string; encoding?: string }>;
  }): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized. Configure email settings first.');
      }

      const config = await this.emailConfigRepository.findOne({
        where: { isActive: true, isVerified: true },
      });

      const normalizedAttachments = options.attachments?.map((att: any) => {
        if (att && typeof att.content === 'string') {
          return {
            ...att,
            content: Buffer.from(att.content, att.encoding === 'utf8' || att.encoding === 'utf-8' ? 'utf8' : 'base64'),
          };
        }
        return att;
      });

      await this.transporter.sendMail({
        from: `${config?.senderName || 'Gym Manager'} <${config?.email || 'noreply@gymmanager.com'}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: normalizedAttachments,
      });

      this.logger.log(`Email sent to ${options.to}`);

      // Intentar enviar también por WhatsApp
      try {
        const userWithPhone = await this.userRepository.findOne({
          where: { email: options.to },
          select: ['phone'],
        });

        if (userWithPhone?.phone) {
          if (options.attachments && options.attachments.length > 0) {
            this.logger.log(`Skipping auto WhatsApp direct send for ${userWithPhone.phone} because email has attachments.`);
          } else {
            const statusInfo = this.whatsappService.getStatus();
            if (statusInfo.status === 'CONNECTED') {
              const fallbackText = `¡Hola! Te hemos enviado una notificación importante de Gym Manager. Adjuntamos el documento detallado.\n\nAsunto: ${options.subject}`;
              await this.whatsappService.sendHtmlAsPdf(userWithPhone.phone, options.html, fallbackText);
            } else {
              this.logger.warn(`WhatsApp no está conectado. No se pudo enviar el PDF a ${userWithPhone.phone}`);
            }
          }
        }
      } catch (waError) {
        this.logger.error(`Error sending WhatsApp direct message to ${options.to}: ${waError.message}`);
      }

    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Genera una plantilla profesional personalizada
   */
  generateTemplate(type: 'welcome' | 'payment' | 'promotion' | 'custom', data: any): string {
    switch (type) {
      case 'welcome':
        return EmailTemplateBuilder.welcomeEmail(data.memberName, data.message);
      case 'payment':
        return EmailTemplateBuilder.paymentReminderEmail(data.memberName, data.reminderType, data.message);
      case 'promotion':
        return EmailTemplateBuilder.promotionEmail(data.title, data.message, data.discount);
      case 'custom':
        return EmailTemplateBuilder.customTemplate(data.title, data.message, data.buttonText);
      default:
        return EmailTemplateBuilder.customTemplate('Notificación', data.message);
    }
  }
}
