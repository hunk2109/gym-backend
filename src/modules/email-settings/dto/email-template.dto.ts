import { IsString, IsEnum, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { EmailTriggerType } from '../entities';

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsEnum(EmailTriggerType)
  triggerType: EmailTriggerType;

  @IsString()
  subject: string;

  @IsString()
  htmlContent: string;

  @IsString()
  @IsOptional()
  plainTextContent?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  includeDiscountCode?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  discountCodePercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  discountCodeDaysValid?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsesPerCode?: number;
}

export class UpdateEmailTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(EmailTriggerType)
  @IsOptional()
  triggerType?: EmailTriggerType;

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
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  includeDiscountCode?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  discountCodePercentage?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(365)
  discountCodeDaysValid?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxUsesPerCode?: number;
}
