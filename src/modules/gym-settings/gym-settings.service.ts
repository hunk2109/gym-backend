import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymSettings } from '../../entities/gym-settings.entity';
import { CreateGymSettingsDto, UpdateGymSettingsDto } from './dto/gym-settings.dto';

@Injectable()
export class GymSettingsService {
  constructor(
    @InjectRepository(GymSettings)
    private gymSettingsRepository: Repository<GymSettings>,
  ) {}

  async create(createDto: CreateGymSettingsDto): Promise<GymSettings> {
    const existing = await this.gymSettingsRepository.find();
    if (existing.length > 0) {
      throw new Error('Gym settings already exist');
    }

    const settings = this.gymSettingsRepository.create(createDto);
    return this.gymSettingsRepository.save(settings) as any;
  }

  async getSettings(): Promise<GymSettings> {
    const settings = await this.gymSettingsRepository.findOne({
      where: {},
    });

    if (!settings) {
      throw new NotFoundException('Gym settings not found');
    }

    return settings;
  }

  async update(updateDto: UpdateGymSettingsDto): Promise<GymSettings> {
    const settings = await this.getSettings();
    Object.assign(settings, updateDto);
    return this.gymSettingsRepository.save(settings) as any;
  }

  async getOrCreate(defaultSettings: CreateGymSettingsDto): Promise<GymSettings> {
    try {
      return await this.getSettings();
    } catch {
      return this.create(defaultSettings);
    }
  }
}
