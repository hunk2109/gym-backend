import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDate } from 'class-validator';

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
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
  @IsArray()
  benefits?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignMembershipDto {
  @IsNumber()
  memberId: number;

  @IsNumber()
  membershipId: number;

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
  @IsNumber()
  membershipId: number;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsDate()
  paymentDate?: Date;
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
