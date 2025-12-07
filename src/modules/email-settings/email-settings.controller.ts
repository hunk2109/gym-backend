import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailTemplateService } from './email-template.service';
import { PaymentReminderService } from './payment-reminder.service';
import {
  CreateEmailConfigDto,
  UpdateEmailConfigDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  SendEmailDto,
  SendTestEmailDto,
  CreatePaymentReminderDto,
  UpdatePaymentReminderDto,
} from './dto';

@Controller('email-settings')
export class EmailSettingsController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailConfigService: EmailConfigService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly paymentReminderService: PaymentReminderService,
  ) {}

  // ============ EMAIL CONFIG ENDPOINTS ============

  @Post('config')
  @HttpCode(HttpStatus.CREATED)
  async createEmailConfig(@Body() dto: CreateEmailConfigDto) {
    return this.emailConfigService.createConfig(dto);
  }

  @Get('config')
  async getEmailConfigs() {
    return this.emailConfigService.getAllConfigs();
  }

  @Get('config/:id')
  async getEmailConfig(@Param('id') id: string) {
    return this.emailConfigService.getConfigById(id);
  }

  @Put('config/:id')
  async updateEmailConfig(@Param('id') id: string, @Body() dto: UpdateEmailConfigDto) {
    return this.emailConfigService.updateConfig(id, dto);
  }

  @Delete('config/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmailConfig(@Param('id') id: string) {
    return this.emailConfigService.deleteConfig(id);
  }

  @Post('config/:id/verify')
  async verifyEmailConfig(@Param('id') id: string, @Body() dto: SendTestEmailDto) {
    return this.emailConfigService.verifyConfig(id, dto.recipientEmail);
  }

  @Post('config/:id/set-active')
  async setActiveConfig(@Param('id') id: string) {
    return this.emailConfigService.setActiveConfig(id);
  }

  // ============ EMAIL TEMPLATE ENDPOINTS ============

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createEmailTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.emailTemplateService.createTemplate(dto);
  }

  @Get('templates')
  async getEmailTemplates() {
    return this.emailTemplateService.getAllTemplates();
  }

  @Get('templates/active')
  async getActiveEmailTemplates() {
    return this.emailService.getActiveTemplates();
  }

  @Get('templates/:id')
  async getEmailTemplate(@Param('id') id: string) {
    return this.emailTemplateService.getTemplateById(id);
  }

  @Put('templates/:id')
  async updateEmailTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.emailTemplateService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEmailTemplate(@Param('id') id: string) {
    return this.emailTemplateService.deleteTemplate(id);
  }

  // ============ EMAIL SENDING ENDPOINTS ============

  @Post('send')
  async sendEmail(@Body() dto: SendEmailDto) {
    return this.emailService.sendEmail(dto);
  }

  @Post('send-test')
  async sendTestEmail(@Body() dto: SendTestEmailDto) {
    return this.emailService.sendEmail({
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      subject: 'Test Email - Gym Manager',
      htmlContent: '<h1>Test Email</h1><p>This is a test email from Gym Manager.</p>',
      plainTextContent: 'Test Email - This is a test email from Gym Manager.',
    });
  }

  // ============ EMAIL LOG ENDPOINTS ============

  @Get('logs')
  async getEmailLogs(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.emailService.getEmailLogs(limit, offset);
  }

  // ============ PAYMENT REMINDER ENDPOINTS ============

  @Post('reminders')
  @HttpCode(HttpStatus.CREATED)
  async createPaymentReminder(@Body() dto: CreatePaymentReminderDto) {
    return this.paymentReminderService.createReminder(dto);
  }

  @Get('reminders')
  async getPaymentReminders() {
    return this.paymentReminderService.getAllReminders();
  }

  @Get('reminders/:id')
  async getPaymentReminder(@Param('id') id: string) {
    return this.paymentReminderService.getReminderById(id);
  }

  @Put('reminders/:id')
  async updatePaymentReminder(@Param('id') id: string, @Body() dto: UpdatePaymentReminderDto) {
    return this.paymentReminderService.updateReminder(id, dto);
  }

  @Delete('reminders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePaymentReminder(@Param('id') id: string) {
    return this.paymentReminderService.deleteReminder(id);
  }

  @Post('reminders/:id/toggle')
  async togglePaymentReminder(@Param('id') id: string) {
    return this.paymentReminderService.toggleReminder(id);
  }
}
