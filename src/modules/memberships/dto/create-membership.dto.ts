import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDate, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { MembershipType } from '../../../entities/membership.entity';

export class CreateMembershipDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  durationMonths: number;

  @IsOptional()
  @IsNumber()
  durationDays?: number; // Para membresías no recurrentes (días específicos en lugar de meses)

  @IsOptional()
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsEnum(MembershipType)
  @Transform(({ value }) => {
    // Convertir string a enum si es necesario
    if (typeof value === 'string') {
      return value.toLowerCase() as MembershipType;
    }
    return value;
  })
  type?: MembershipType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean; // Si es true, genera renovaciones automáticas. Si es false, solo pago inicial al asignar

  @IsOptional()
  @IsNumber()
  maxGroupCompanions?: number;

  @IsOptional()
  @IsArray()
  accessSchedules?: Array<{
    dayOfWeek: string;
    timeStart: string;
    timeEnd: string;    isEnabled?: boolean;  }>;
}

export class UpdateMembershipDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  durationMonths?: number;

  @IsOptional()
  @IsNumber()
  durationDays?: number; // Para membresías no recurrentes (días específicos en lugar de meses)

  @IsOptional()
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean; // Si es true, genera renovaciones automáticas. Si es false, solo pago inicial al asignar

  @IsOptional()
  @IsNumber()
  maxGroupCompanions?: number;


  @IsOptional()
  @IsArray()
  accessSchedules?: Array<{
    dayOfWeek: string;
    timeStart: string;
    timeEnd: string;
    isEnabled?: boolean;
  }>;
}

export class AssignMembershipDto {
  @IsString()
  memberId: string;

  @IsString()
  membershipId: string;

  @IsOptional()
  @IsString()
  startDate?: string; // Será un ISO8601 string del frontend

  @IsOptional()
  @IsString()
  endDate?: string; // Será un ISO8601 string del frontend

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsString()
  paymentDate?: string; // Será un ISO8601 string del frontend
}

// Transform hook para sanitizar memberId si viene como objeto
export function sanitizeAssignMembershipDto(dto: AssignMembershipDto): AssignMembershipDto {
  // Si memberId es un objeto (por error de serialización), extraer solo el id
  if (typeof dto.memberId === 'object' && dto.memberId !== null) {
    (dto as any).memberId = (dto.memberId as any).id || (dto.memberId as any);
  }
  if (typeof dto.membershipId === 'object' && dto.membershipId !== null) {
    (dto as any).membershipId = (dto.membershipId as any).id || (dto.membershipId as any);
  }
  return dto;
}

export class RenewMembershipDto {
  @IsString()
  membershipId: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsDate()
  paymentDate?: Date;

  @IsOptional()
  @IsString()
  promotionCode?: string;

  @IsOptional()
  @IsNumber()
  discountPercentage?: number;

  @IsOptional()
  @IsString()
  discountReason?: string;
}

export class MembershipResponseDto {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationMonths: number;
  benefits?: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberMembershipResponseDto {
  id: number;
  member: any;
  memberId: number;
  membership: any;
  membershipId: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  amountPaid?: number;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
