import { IsString, IsOptional, IsDecimal, IsEmail } from 'class-validator';

export class CreateGymSettingsDto {
  @IsString()
  gymName: string;

  @IsOptional()
  @IsString()
  description: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  website: string;

  @IsString()
  openingTime: string;

  @IsString()
  closingTime: string;

  @IsDecimal()
  membershipPrice: number;

  @IsOptional()
  @IsString()
  policies: string;
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
  website?: string;

  @IsOptional()
  @IsString()
  openingTime?: string;

  @IsOptional()
  @IsString()
  closingTime?: string;

  @IsOptional()
  @IsDecimal()
  membershipPrice?: number;

  @IsOptional()
  @IsString()
  policies?: string;
}
