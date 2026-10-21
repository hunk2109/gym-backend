import { IsString, IsEmail, IsOptional, IsDate, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
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
  @Transform(({ value }) => {
    if (!value) return undefined;
    const v = String(value).trim().toLowerCase();
    if (v === 'm' || v === 'male' || v === 'masculino') return MemberGender.MALE;
    if (v === 'f' || v === 'female' || v === 'femenino') return MemberGender.FEMALE;
    if (v === 'other' || v === 'otro') return MemberGender.OTHER;
    return value;
  })
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
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveWhatsapp?: boolean;

  @IsOptional()
  createdAt?: string | Date;

  @IsOptional()
  updatedAt?: string | Date;
}

export class UpdateMemberDto {
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
  user?: any;

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
  @Transform(({ value }) => {
    if (!value || value === '' || value === 'null') return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  })
  dateOfBirth?: Date;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const v = String(value).trim().toLowerCase();
    if (v === 'm' || v === 'male' || v === 'masculino') return MemberGender.MALE;
    if (v === 'f' || v === 'female' || v === 'femenino') return MemberGender.FEMALE;
    if (v === 'other' || v === 'otro') return MemberGender.OTHER;
    return value;
  })
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
  @Transform(({ value }) => {
    if (!value || value === '' || value === 'null') return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  })
  lastVisit?: Date;

  @IsOptional()
  @IsString()
  fingerprints?: string; // JSON con información de huellas dactilares

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveEmails?: boolean;

  @IsOptional()
  @IsBoolean()
  receiveWhatsapp?: boolean;
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
  notificationsEnabled?: boolean;
  receiveEmails?: boolean;
  receiveWhatsapp?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
