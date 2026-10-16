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

    // Convertir base64 a Buffer si viene logoImage
    const createData: any = { ...createDto };
    if (createDto.logoImage) {
      try {
        createData.logoImage = Buffer.from(createDto.logoImage, 'base64');
        this.logger.log(`[CREATE] Logo image convertido: ${createData.logoImage.length} bytes`);
      } catch (error) {
        this.logger.error(`[CREATE] Error convertiendo logoImage: ${error.message}`);
        delete createData.logoImage;
      }
    }

    const settings = this.gymSettingsRepository.create(createData);
    return this.gymSettingsRepository.save(settings) as any;
  }

  async getSettings(): Promise<GymSettings> {
    // Obtener el registro más reciente (últimu actualizado)
    const allSettings = await this.gymSettingsRepository.find({
      order: { updatedAt: 'DESC' },
      take: 1,
    });

    let settings = allSettings.length > 0 ? allSettings[0] : null;

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
        ticketPaperSize: '80mm',
        enableMembershipRenewal: true,
        enablePaymentReminders: true,
        enableBirthdayEmails: true,
        enableAnniversaryEmails: true,
        enableExpirationWarnings: true,
        enableCampaignScheduler: true,
        enableDailySummaryReport: true,
      });
      settings = await this.gymSettingsRepository.save(defaultSettings);
      this.logger.log('[GET] Default gym settings created');
    }

    // Convertir logoImage Buffer a base64 string si existe
    const response = { ...settings } as any;
    if (response.logoImage && Buffer.isBuffer(response.logoImage)) {
      try {
        response.logoImage = response.logoImage.toString('base64');
        this.logger.log('[GET] Logo image convertido a base64');
      } catch (error) {
        this.logger.error(`[GET] Error convirtiendo logoImage a base64: ${error.message}`);
      }
    }

    return response;
  }

  async update(updateDto: UpdateGymSettingsDto): Promise<GymSettings> {
    this.logger.log(`[UPDATE] Received updateDto with fields: ${Object.keys(updateDto).join(', ')}`);
    const settings = await this.getSettings();
    
    // Convertir base64 a Buffer si viene logoImage
    const updateData: any = { ...updateDto };
    if (updateDto.logoImage) {
      try {
        // El base64 viene como string, convertir a Buffer
        updateData.logoImage = Buffer.from(updateDto.logoImage, 'base64');
        this.logger.log(`[UPDATE] Logo image convertido: ${updateData.logoImage.length} bytes`);
      } catch (error) {
        this.logger.error(`[UPDATE] Error convertiendo logoImage: ${error.message}`);
        delete updateData.logoImage;
      }
    }

    // Normalizar closingReportRecipients si viene como texto o JSON string
    if (updateData.closingReportRecipients !== undefined) {
      if (typeof updateData.closingReportRecipients === 'string') {
        const raw = updateData.closingReportRecipients.trim();
        let parsed: any = null;
        if (raw.startsWith('[') && raw.endsWith(']')) {
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = null;
          }
        }

        if (Array.isArray(parsed)) {
          updateData.closingReportRecipients = parsed;
        } else {
          const items = raw
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          updateData.closingReportRecipients = items.map((item: string) => {
            const isEmail = item.includes('@');
            return {
              name: item,
              email: isEmail ? item : '',
              phone: isEmail ? '' : item.replace(/[^0-9+]/g, ''),
              sendEmail: isEmail,
              sendWhatsapp: !isEmail,
            };
          });
        }
      }
    }
    
    Object.assign(settings, updateData);
    this.logger.log(`[UPDATE] Settings after assign`);
    const saved = await this.gymSettingsRepository.save(settings);
    this.logger.log(`[UPDATE] Settings saved successfully`);
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
