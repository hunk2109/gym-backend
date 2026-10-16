import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePromotionDto {
  @IsString()
  code: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  capturesBirthday?: boolean;

  @IsOptional()
  @IsNumber()
  maxUses?: number | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  capturesBirthday?: boolean;

  @IsOptional()
  @IsNumber()
  maxUses?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date | null;
}

export class ValidatePromotionDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsDate()
  birthDate?: Date;
}

export class PromotionResponseDto {
  id: string;
  code: string;
  discountPercentage: number;
  description?: string | null;
  capturesBirthday: boolean;
  maxUses?: number | null;
  usesCount: number;
  active: boolean;
  createdAt: Date;
  expiresAt?: Date | null;
  isValid: boolean;
  remainingUses?: number;
}
