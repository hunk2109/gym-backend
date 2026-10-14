import { IsString, IsOptional, IsNumber, IsEmail, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateGymSettingsDto {
  @IsOptional()
  @IsString()
  gymName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  rnc?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  membershipPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  membershipSuspensionDays?: number;

  @IsOptional()
  @IsString()
  policies?: string;

  // Envíos automáticos
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  enableBirthdayEmails?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  enableExpirationWarnings?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  enablePaymentReminders?: boolean;

  @IsOptional()
  @IsString()
  logoImage?: string; // Base64 encoded image para logo de facturas

  // MB360 Configuration
  @IsOptional()
  @IsBoolean()
  mb360Enabled?: boolean;

  @IsOptional()
  @IsString()
  mb360Ip?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  mb360Port?: number;

  @IsOptional()
  @IsString()
  mb360Username?: string;

  @IsOptional()
  @IsString()
  mb360Password?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  mb360RelayId?: number;

  @IsOptional()
  @IsString()
  mb360Timezone?: string;

  @IsOptional()
  closingReportRecipients?: any;

  @IsOptional()
  @IsString()
  closingReportTime1?: string;

  @IsOptional()
  @IsString()
  closingReportTime2?: string;

  @IsOptional()
  @IsString()
  notificationChannel?: string;

  @IsOptional()
  @IsString()
  ticketPaperSize?: string;
}

export class UpdateGymSettingsDto {
  @IsOptional()
  @IsString()
  gymName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  rnc?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : undefined)
  @IsNumber()
  membershipPrice?: number;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  membershipSuspensionDays?: number;

  @IsOptional()
  @IsString()
  policies?: string;

  @IsOptional()
  @IsString()
  logoImage?: string; // Base64 encoded image para logo de facturas

  // MB360 Configuration
  @IsOptional()
  @IsBoolean()
  mb360Enabled?: boolean;

  @IsOptional()
  @IsString()
  mb360Ip?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  mb360Port?: number;

  @IsOptional()
  @IsString()
  mb360Username?: string;

  @IsOptional()
  @IsString()
  mb360Password?: string;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value) : undefined)
  @IsNumber()
  mb360RelayId?: number;

  @IsOptional()
  @IsString()
  mb360Timezone?: string;

  @IsOptional()
  closingReportRecipients?: any;

  @IsOptional()
  @IsString()
  closingReportTime1?: string;

  @IsOptional()
  @IsString()
  closingReportTime2?: string;

  @IsOptional()
  @IsString()
  notificationChannel?: string;

  @IsOptional()
  @IsString()
  ticketPaperSize?: string;
}
