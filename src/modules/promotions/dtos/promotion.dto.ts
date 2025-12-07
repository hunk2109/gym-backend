import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsDateString } from 'class-validator';

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
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
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
  maxUses?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;
}

export class ValidatePromotionDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsDateString()
  birthDate?: Date;
}

export class PromotionResponseDto {
  id: string;
  code: string;
  discountPercentage: number;
  description: string;
  capturesBirthday: boolean;
  maxUses: number;
  usesCount: number;
  active: boolean;
  createdAt: Date;
  expiresAt: Date;
  isValid: boolean;
  remainingUses?: number;
}
