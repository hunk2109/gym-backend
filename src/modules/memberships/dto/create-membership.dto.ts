import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDate, IsEnum, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { MembershipType, PriceType } from '../../../entities/membership.entity';

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
  @IsEnum(PriceType)
  @Transform(({ value }) => {
    // Convertir string a enum si es necesario
    if (typeof value === 'string') {
      return value.toLowerCase() as PriceType;
    }
    return PriceType.FIXED;
  })
  priceType?: PriceType; // 'fixed' o 'variable'

  @IsOptional()
  @IsNumber()
  pricePerCompanion?: number; // Precio adicional por cada acompañante (solo para membresías grupales)

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
  @ValidateIf((o, value) => value !== null && value !== undefined)
  @IsNumber()
  durationDays?: number | null; // Para membresías no recurrentes (días específicos en lugar de meses)

  @IsOptional()
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsEnum(MembershipType)
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() as MembershipType;
    }
    return value;
  })
  type?: MembershipType;

  @IsOptional()
  @IsString()
  parentMembershipId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean; // Si es true, genera renovaciones automáticas. Si es false, solo pago inicial al asignar

  @IsOptional()
  @IsEnum(PriceType)
  @Transform(({ value }) => {
    // Convertir string a enum si es necesario
    if (typeof value === 'string') {
      return value.toLowerCase() as PriceType;
    }
    return PriceType.FIXED;
  })
  priceType?: PriceType; // 'fixed' o 'variable'

  @IsOptional()
  @ValidateIf((o, value) => value !== null && value !== undefined)
  @IsNumber()
  pricePerCompanion?: number | null; // Precio adicional por cada acompañante (solo para membresías grupales)

  @IsOptional()
  @ValidateIf((o, value) => value !== null && value !== undefined)
  @IsNumber()
  maxGroupCompanions?: number | null;

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
  payAmount?: number;

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
  payAmount?: number;

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
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMonths: number;
  durationDays?: number;
  benefits?: string[];
  type: string;
  isActive: boolean;
  isRecurring: boolean;
  priceType: string;
  maxGroupCompanions?: number;
  accessSchedules?: any[];
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
  payAmount?: number;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
