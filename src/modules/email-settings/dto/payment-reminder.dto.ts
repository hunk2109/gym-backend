import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ReminderType, ReminderFrequency } from '../entities/payment-reminder.entity';

export class CreatePaymentReminderDto {
  @IsString()
  memberId: string;

  @IsEnum(ReminderType)
  type: ReminderType;

  @IsEnum(ReminderFrequency)
  frequency: ReminderFrequency;

  @IsNumber()
  @Min(0)
  @Max(30)
  daysBeforeDue: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxRetries?: number = 3;
}

export class UpdatePaymentReminderDto {
  @IsEnum(ReminderType)
  @IsOptional()
  type?: ReminderType;

  @IsEnum(ReminderFrequency)
  @IsOptional()
  frequency?: ReminderFrequency;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(30)
  daysBeforeDue?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  maxRetries?: number;
}

export class PaymentReminderResponseDto {
  id: string;
  memberId: string;
  type: ReminderType;
  frequency: ReminderFrequency;
  daysBeforeDue: number;
  isActive: boolean;
  lastSentAt: Date;
  nextSendAt: Date;
  retryCount: number;
  maxRetries: number;
  lastErrorMessage: string;
  createdAt: Date;
  updatedAt: Date;
}
