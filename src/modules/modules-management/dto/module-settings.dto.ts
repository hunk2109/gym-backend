import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateModuleSettingsDto {
  @IsString()
  @IsOptional()
  moduleName?: string;

  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}

export class GetModuleSettingsDto {
  @IsString()
  moduleName: string;

  @IsBoolean()
  isEnabled: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
