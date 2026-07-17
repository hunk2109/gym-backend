import { IsString, IsEmail, IsDateString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsEnum(EmployeeRole, { message: `El rol debe ser uno de: ${Object.values(EmployeeRole).join(', ')}` })
  role: EmployeeRole;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  salary: number;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
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
  @IsEnum(EmployeeRole, { message: `El rol debe ser uno de: ${Object.values(EmployeeRole).join(', ')}` })
  role?: EmployeeRole;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  salary?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}
