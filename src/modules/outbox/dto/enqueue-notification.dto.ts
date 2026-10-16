import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import {
  NotificationChannel,
  NotificationOutboxType,
  NotificationPriority,
  NotificationOutboxStatus,
} from '../entities/notification-outbox.entity';

export class EnqueueEmailDto {
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsOptional()
  attachments?: Array<{ filename: string; content?: any; base64?: string; contentType?: string; encoding?: string }>;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsOptional()
  scheduledFor?: Date;
}

export class EnqueueWhatsappDto {
  @IsString()
  @IsNotEmpty()
  recipient: string; // Número de teléfono

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsNotEmpty()
  content: string; // Mensaje de texto

  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsOptional()
  scheduledFor?: Date;
}

export class EnqueueWhatsappPdfDto {
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  base64Data: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsEnum(NotificationPriority)
  @IsOptional()
  priority?: NotificationPriority;

  @IsOptional()
  scheduledFor?: Date;
}

export class GetOutboxQueryDto {
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationOutboxStatus)
  status?: NotificationOutboxStatus;

  @IsOptional()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
