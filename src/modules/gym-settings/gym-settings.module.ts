import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GymSettings } from '../../entities/gym-settings.entity';
import { GymSettingsService } from './gym-settings.service';
import { GymSettingsController } from './gym-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([GymSettings])],
  providers: [GymSettingsService],
  controllers: [GymSettingsController],
  exports: [GymSettingsService],
})
export class GymSettingsModule {}
