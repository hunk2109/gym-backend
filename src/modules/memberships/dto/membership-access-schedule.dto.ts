import { IsString, IsEnum, Matches } from 'class-validator';
import { DayOfWeek } from '../../../entities/membership-access-schedule.entity';

export class CreateMembershipAccessScheduleDto {
  @IsString()
  membershipId: string;

  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'timeStart debe estar en formato HH:mm:ss',
  })
  timeStart: string;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'timeEnd debe estar en formato HH:mm:ss',
  })
  timeEnd: string;
}

export class UpdateMembershipAccessScheduleDto {
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'timeStart debe estar en formato HH:mm:ss',
  })
  timeStart?: string;

  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, {
    message: 'timeEnd debe estar en formato HH:mm:ss',
  })
  timeEnd?: string;
}
