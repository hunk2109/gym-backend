import { IsString, IsEmail, IsDateString, IsDecimal, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { EmployeeRole } from '../../../entities/employee.entity';

export class CreateEmployeeDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  position: string;

  @IsEnum(EmployeeRole)
  role: EmployeeRole;

  @IsDateString()
  hireDate: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsDecimal()
  salary: number;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}

export class UpdateEmployeeDto {
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
  position?: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsDecimal()
  salary?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  emergencyContact?: string;
}
