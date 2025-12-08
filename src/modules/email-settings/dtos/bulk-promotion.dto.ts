import { IsString, IsBoolean, IsArray, IsOptional, IsDateString } from 'class-validator';

export class CreateBulkPromotionDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  htmlContent: string;

  @IsBoolean()
  sendToAll: boolean;

  @IsOptional()
  @IsArray()
  memberIds?: string[];

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}

export class UpdateBulkPromotionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;
}

export class BirthdayDiscountSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  percentage?: string;
}
