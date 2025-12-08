import { IsString, IsBoolean, IsOptional, IsObject } from 'class-validator';

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

  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;
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
