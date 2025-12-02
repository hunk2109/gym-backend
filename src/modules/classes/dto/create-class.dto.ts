import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, IsUUID, IsDate } from 'class-validator';
import { ClassLevel, GymClass } from '../../../entities/gym-class.entity';
import { EnrollmentStatus } from '../../../entities/class-enrollment.entity';

export class CreateClassDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @IsString()
  schedule: string;

  @IsNumber()
  capacity: number;

  @IsOptional()
  @IsEnum(ClassLevel)
  level?: ClassLevel;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  trainerId?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsEnum(ClassLevel)
  level?: ClassLevel;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class EnrollMemberDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsDate()
  enrollmentDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsNumber()
  sessionsAttended?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDate()
  completionDate?: Date;
}

export class ClassResponseDto {
  id: string;
  name: string;
  description?: string;
  trainer?: any;
  trainerId?: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  level: ClassLevel;
  room?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
