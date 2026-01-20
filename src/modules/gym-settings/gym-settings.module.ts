import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymSettings } from '../../entities/gym-settings.entity';
import { AccessAttempt } from '../../entities/access-attempt.entity';
import { GymSettingsService } from './gym-settings.service';
import { GymSettingsController } from './gym-settings.controller';
import { MB360DeviceService } from './services/mb360-device.service';
import { MB360Controller } from './mb360.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GymSettings, AccessAttempt])],
  providers: [GymSettingsService, MB360DeviceService],
  controllers: [GymSettingsController, MB360Controller],
  exports: [GymSettingsService, MB360DeviceService],
})
export class GymSettingsModule {}
