import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  @Max(100)
  tableNumber: number;

  @IsInt()
  @Min(1)
  @Max(20)
  capacity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTableDto {
  @IsOptional()
  @IsInt()
  capacity?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
