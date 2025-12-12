import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RegisterByCodeDto {
  @IsString()
  memberCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class RegisterByNameDto {
  @IsString()
  memberName: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
