import { IsUUID } from 'class-validator';

export class TestConnectionDto {
  @IsUUID()
  gymSettingsId: string;
}

export class UnlockDoorDto {
  @IsUUID()
  gymSettingsId: string;
}

export class GetAccessAttemptsDto {
  @IsUUID()
  gymSettingsId: string;

  limit?: number;
}

export class GetTodayStatsDto {
  @IsUUID()
  gymSettingsId: string;
}

export class GetDeviceInfoDto {
  @IsUUID()
  gymSettingsId: string;
}

export class MB360ResponseDto {
  success: boolean;
  message: string;
  data?: any;
}
