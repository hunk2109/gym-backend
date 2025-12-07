import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfig } from './entities';
import { CreateEmailConfigDto, UpdateEmailConfigDto } from './dto';
import { EmailService } from './email.service';

@Injectable()
export class EmailConfigService {
  private readonly logger = new Logger(EmailConfigService.name);

  constructor(
    @InjectRepository(EmailConfig)
    private emailConfigRepository: Repository<EmailConfig>,
    private emailService: EmailService,
  ) {}

  async createConfig(dto: CreateEmailConfigDto): Promise<EmailConfig> {
    const existingActive = await this.emailConfigRepository.findOne({
      where: { isActive: true },
    });

    const config = this.emailConfigRepository.create({
      ...dto,
      isActive: !existingActive, // Activar si es la primera configuración
    });

    return this.emailConfigRepository.save(config);
  }

  async getAllConfigs(): Promise<EmailConfig[]> {
    return this.emailConfigRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getConfigById(id: string): Promise<EmailConfig> {
    const config = await this.emailConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new BadRequestException('Email configuration not found');
    }
    return config;
  }

  async updateConfig(id: string, dto: UpdateEmailConfigDto): Promise<EmailConfig> {
    const config = await this.getConfigById(id);
    Object.assign(config, dto);
    return this.emailConfigRepository.save(config);
  }

  async deleteConfig(id: string): Promise<void> {
    const config = await this.getConfigById(id);
    if (config.isActive) {
      throw new BadRequestException('Cannot delete active email configuration');
    }
    await this.emailConfigRepository.delete(id);
  }

  async verifyConfig(id: string, testEmail: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.emailService.verifyEmailConfig(id, testEmail);
      return { success: true, message: 'Email configuration verified successfully' };
    } catch (error) {
      this.logger.error(`Failed to verify config ${id}`, error);
      throw error;
    }
  }

  async setActiveConfig(id: string): Promise<EmailConfig> {
    // Desactivar todas las demás
    await this.emailConfigRepository.update({ isActive: true }, { isActive: false });

    // Activar la seleccionada
    const config = await this.getConfigById(id);
    config.isActive = true;
    return this.emailConfigRepository.save(config);
  }
}
