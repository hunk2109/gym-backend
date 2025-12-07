import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailTemplate } from './entities';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto';

@Injectable()
export class EmailTemplateService {
  constructor(
    @InjectRepository(EmailTemplate)
    private emailTemplateRepository: Repository<EmailTemplate>,
  ) {}

  async createTemplate(dto: CreateEmailTemplateDto): Promise<EmailTemplate> {
    const template = this.emailTemplateRepository.create({
      ...dto,
      availableVariables: [
        'firstName',
        'lastName',
        'email',
        'membershipType',
        'discount',
        'expiryDate',
        'code',
      ],
    });
    return this.emailTemplateRepository.save(template);
  }

  async getAllTemplates(): Promise<EmailTemplate[]> {
    return this.emailTemplateRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.emailTemplateRepository.findOne({ where: { id } });
    if (!template) {
      throw new BadRequestException('Email template not found');
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateEmailTemplateDto): Promise<EmailTemplate> {
    const template = await this.getTemplateById(id);
    Object.assign(template, dto);
    return this.emailTemplateRepository.save(template);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.getTemplateById(id);
    await this.emailTemplateRepository.delete(id);
  }
}
