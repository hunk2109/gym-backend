import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PayrollStatus } from '../../../entities/payroll.entity';

export class CreatePayrollDto {
  @IsString()
  employeeId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  baseSalary: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  bonuses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  holidayBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  afpDeduction?: number; // AFP ~2.87%

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  isrDeduction?: number; // ISR variable

  @IsOptional()
  @Type(() => Boolean)
  applyTSS?: boolean; // Indicar si se aplica descuento a TSS

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssPercentage?: number; // Porcentaje de TSS (por defecto 2.87%)

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssDeduction?: number; // TSS ~2.87%

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  otherDeductions?: number; // Otras deducciones

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePayrollDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  bonuses?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  holidayBonus?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  afpDeduction?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  isrDeduction?: number;

  @IsOptional()
  @Type(() => Boolean)
  applyTSS?: boolean; // Indicar si se aplica descuento a TSS

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssPercentage?: number; // Porcentaje de TSS

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssDeduction?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  otherDeductions?: number;

  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GeneratePayrollDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year: number;

  @IsOptional()
  @IsString({ each: true })
  employeeIds?: string[]; // Si no se proporciona, se generan para todos los empleados activos

  @IsOptional()
  @Type(() => Boolean)
  applyTSS?: boolean; // Aplicar TSS a todos los empleados

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssPercentage?: number; // Porcentaje de TSS (por defecto 2.87%)
}

export class PayrollDeductionOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @Type(() => Number)
  @IsInt()
  @Min(2020)
  @Max(2099)
  year: number;

  @IsOptional()
  @IsString({ each: true })
  employeeIds?: string[]; // Si no se proporciona, se generan para todos

  @IsOptional()
  @Type(() => Boolean)
  applyAFP?: boolean; // Aplicar AFP

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  afpPercentage?: number; // Porcentaje de AFP

  @IsOptional()
  @Type(() => Boolean)
  applyISR?: boolean; // Aplicar ISR

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  isrPercentage?: number; // Porcentaje de ISR

  @IsOptional()
  @Type(() => Boolean)
  applyTSS?: boolean; // Aplicar TSS

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  tssPercentage?: number; // Porcentaje de TSS (por defecto 2.87%)

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  otherDeductions?: number; // Otras deducciones fijas
}
