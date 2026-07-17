import { IsEmail, IsString, IsOptional, IsUUID } from 'class-validator';

export class SendEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsUUID()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  plainTextContent?: string;

  @IsString()
  @IsOptional()
  memberId?: string;

  // Variables para reemplazar en template
  @IsOptional()
  variables?: Record<string, string>;

  @IsOptional()
  attachments?: { filename: string; content: any; contentType?: string }[];
}

export class SendTestEmailDto {
  @IsEmail()
  recipientEmail: string;

  @IsString()
  @IsOptional()
  recipientName?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;
}
