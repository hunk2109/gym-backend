import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from '../../entities/app-config.entity';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  constructor(
    @InjectRepository(AppConfig)
    private configRepository: Repository<AppConfig>,
  ) {}

  /**
   * Obtiene un valor de configuración
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.configRepository.findOne({ where: { key } });
      return config?.value || null;
    } catch (error) {
      this.logger.error(`Error obteniendo config ${key}: ${error}`);
      return null;
    }
  }

  /**
   * Guarda un valor de configuración
   */
  async setConfig(key: string, value: string, description?: string): Promise<AppConfig> {
    try {
      const existing = await this.configRepository.findOne({ where: { key } });

      if (existing) {
        existing.value = value;
        if (description) {
          existing.description = description;
        }
        return await this.configRepository.save(existing);
      } else {
        const newConfig = this.configRepository.create({
          key,
          value,
          description,
        });
        return await this.configRepository.save(newConfig);
      }
    } catch (error) {
      this.logger.error(`Error guardando config ${key}: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene todas las configuraciones
   */
  async getAllConfigs(): Promise<AppConfig[]> {
    return await this.configRepository.find();
  }

  /**
   * Elimina una configuración
   */
  async deleteConfig(key: string): Promise<void> {
    await this.configRepository.delete({ key });
  }
}
