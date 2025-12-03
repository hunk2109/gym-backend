import { IsString, IsNumber, IsDate, IsOptional, IsEnum, IsArray, Min } from 'class-validator';

export class CreateGroupMembershipDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  membershipId: string;

  @IsNumber()
  @Min(2)
  maxMembers: number;

  @IsDate()
  startDate: Date;

  @IsDate()
  endDate: Date;

  @IsNumber()
  totalPrice: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateGroupMembershipDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(2)
  maxMembers?: number;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  paidAmount?: number;

  @IsEnum(['active', 'paused', 'expired', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AddMemberToGroupDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RemoveMemberFromGroupDto {
  @IsString()
  userId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GroupMembershipResponseDto {
  id: string;
  name: string;
  description: string;
  membershipId: string;
  createdByUserId: string;
  maxMembers: number;
  currentMembers: number;
  availableSlots: number;
  status: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  paidAmount: number;
  isPaid: boolean;
  isActive: boolean;
  notes: string;
  members: Array<{
    id: string;
    userId: string;
    status: string;
    addedAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  membership: {
    id: string;
    name: string;
    price: number;
    durationMonths: number;
    benefits: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}
