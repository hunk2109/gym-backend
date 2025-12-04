import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymSettings } from '../../entities/gym-settings.entity';
import { CreateGymSettingsDto, UpdateGymSettingsDto } from './dto/gym-settings.dto';

@Injectable()
export class GymSettingsService {
  private readonly logger = new Logger('GymSettingsService');

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
    let settings = await this.gymSettingsRepository.findOne({
      where: {},
    });

    if (!settings) {
      this.logger.log('[GET] No gym settings found, creating default...');
      // Crear configuración por defecto si no existe
      const defaultSettings = this.gymSettingsRepository.create({
        gymName: 'GYM Manager',
        description: '',
        address: '',
        phone: '',
        email: 'contact@gym.local',
        rnc: '',
        website: '',
        openingTime: '06:00',
        closingTime: '22:00',
        membershipPrice: 0,
        policies: '',
      });
      settings = await this.gymSettingsRepository.save(defaultSettings);
      this.logger.log('[GET] Default gym settings created');
    }

    return settings;
  }

  async update(updateDto: UpdateGymSettingsDto): Promise<GymSettings> {
    this.logger.log(`[UPDATE] Received updateDto: ${JSON.stringify(updateDto)}`);
    const settings = await this.getSettings();
    this.logger.log(`[UPDATE] Current settings: ${JSON.stringify(settings)}`);
    Object.assign(settings, updateDto);
    this.logger.log(`[UPDATE] Settings after assign: ${JSON.stringify(settings)}`);
    const saved = await this.gymSettingsRepository.save(settings);
    this.logger.log(`[UPDATE] Settings saved successfully: ${JSON.stringify(saved)}`);
    return saved as any;
  }

  async getOrCreate(defaultSettings: CreateGymSettingsDto): Promise<GymSettings> {
    try {
      return await this.getSettings();
    } catch {
      return this.create(defaultSettings);
    }
  }
}
