import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsUUID, IsDate } from 'class-validator';

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
  @IsUUID()
  memberId: string;

  @IsUUID()
  membershipId: string;

  @IsOptional()
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsDate()
  paymentDate?: Date;
}

export class RenewMembershipDto {
  @IsUUID()
  membershipId: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsDate()
  paymentDate?: Date;
}

export class MembershipResponseDto {
  id: string;
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
  id: string;
  member: any;
  memberId: string;
  membership: any;
  membershipId: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  amountPaid?: number;
  paymentDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
