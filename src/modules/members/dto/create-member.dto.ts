import { IsString, IsEmail, IsOptional, IsDate, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { MemberGender } from '../../../entities/member.entity';

export class CreateMemberDto {
  @IsString()
  userId: string;

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
  joinDate?: Date;

  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;
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
  @IsBoolean()
  isPaid?: boolean;
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
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}
