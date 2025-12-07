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
  ) {
    this.initializeTransporter();
  }

  /**
   * Inicializa el transportador de nodemailer basado en la configuración activa
   */
  private async initializeTransporter() {
    try {
      const activeConfig = await this.emailConfigRepository.findOne({
        where: { isActive: true, isVerified: true },
      });

      if (!activeConfig) {
        this.logger.warn('No active email configuration found');
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
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.email,
            pass: config.password,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            refreshToken: config.refreshToken,
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
      if (!this.transporter) {
        throw new BadRequestException('Email service not configured');
      }

      const config = await this.emailConfigRepository.findOne({
        where: { isActive: true, isVerified: true },
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
      const mailOptions = {
        from: `${config.senderName || 'Gym Manager'} <${config.email}>`,
        to: dto.recipientEmail,
        subject,
        html: htmlContent,
        text: plainTextContent,
      };

      const info = await this.transporter.sendMail(mailOptions);

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
  async verifyEmailConfig(configId: string, testEmail: string): Promise<boolean> {
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
  }): Promise<void> {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized. Configure email settings first.');
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@gymmanager.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      this.logger.log(`Email sent to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw new InternalServerErrorException(`Failed to send email: ${error.message}`);
    }
  }
}
