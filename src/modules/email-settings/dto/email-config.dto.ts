import { IsEnum, IsEmail, IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { EmailProvider } from '../entities';

export class CreateEmailConfigDto {
  @IsEnum(EmailProvider)
  provider: EmailProvider;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPassword?: string;

  @IsBoolean()
  @IsOptional()
  useSSL?: boolean;

  @IsBoolean()
  @IsOptional()
  useTLS?: boolean;

  @IsString()
  @IsOptional()
  senderName?: string;
}

export class UpdateEmailConfigDto {
  @IsEnum(EmailProvider)
  @IsOptional()
  provider?: EmailProvider;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPassword?: string;

  @IsBoolean()
  @IsOptional()
  useSSL?: boolean;

  @IsBoolean()
  @IsOptional()
  useTLS?: boolean;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
