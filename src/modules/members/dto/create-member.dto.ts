import { IsString, IsEmail, IsOptional, IsDate, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { MemberGender } from '../../../entities/member.entity';

export class CreateMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  dateOfBirth?: string | Date;

  @IsOptional()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  joinDate?: string | Date;

  // Campos opcionales que Flutter envía
  @IsOptional()
  id?: string;

  @IsOptional()
  user?: any;

  @IsOptional()
  lastVisit?: string | Date | null;

  @IsOptional()
  @IsString()
  fingerprints?: string; // JSON con información de huellas dactilares

  @IsOptional()
  @IsString()
  registrationPaymentId?: string; // ID del pago de inscripción

  @IsOptional()
  createdAt?: string | Date;

  @IsOptional()
  updatedAt?: string | Date;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsEnum(MemberGender)
  gender?: MemberGender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsDate()
  lastVisit?: Date;

  @IsOptional()
  @IsString()
  fingerprints?: string; // JSON con información de huellas dactilares
}

export class MemberResponseDto {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  documentId?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dateOfBirth?: Date;
  gender?: MemberGender;
  address?: string;
  city?: string;
  zipCode?: string;
  joinDate?: Date;
  lastVisit?: Date;
  fingerprints?: string;
  createdAt: Date;
  updatedAt: Date;
}
