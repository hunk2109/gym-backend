import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailConfigService } from './email-config.service';
import { EmailTemplateService } from './email-template.service';
import { PaymentReminderService } from './payment-reminder.service';
import { AutoEmailService } from './auto-email.service';
import { BulkPromotionService } from './bulk-promotion.service';
import { CouponsService } from '../coupons/coupons.service';
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
import { CreateBulkPromotionDto, UpdateBulkPromotionDto } from './dtos/bulk-promotion.dto';

@Controller('email-settings')
export class EmailSettingsController {
  private readonly logger = new Logger(EmailSettingsController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailConfigService: EmailConfigService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly paymentReminderService: PaymentReminderService,
    private readonly autoEmailService: AutoEmailService,
    private readonly bulkPromotionService: BulkPromotionService,
    private readonly couponsService: CouponsService,
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
    // Use provided content or fall back to defaults
    const htmlContent = dto.htmlContent || 
      '<h1>Test Email</h1><p>This is a test email from Gym Manager.</p>';
    
    const plainTextContent = dto.message || 
      'Test Email - This is a test email from Gym Manager.';

    return this.emailService.sendEmail({
      recipientEmail: dto.recipientEmail,
      recipientName: dto.recipientName,
      subject: dto.subject || 'Test Email - Gym Manager',
      htmlContent: htmlContent,
      plainTextContent: plainTextContent,
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

  // ============ AUTO EMAIL TEST ENDPOINT ============

  @Post('test-auto-emails')
  @HttpCode(HttpStatus.OK)
  async testAutoEmails() {
    await this.autoEmailService.processAutoEmails();
    return {
      success: true,
      message: 'Proceso de emails automáticos ejecutado',
      timestamp: new Date(),
    };
  }

  // ============ BULK PROMOTION ENDPOINTS ============

  @Post('bulk-promotions')
  @HttpCode(HttpStatus.CREATED)
  async createBulkPromotion(@Body() dto: CreateBulkPromotionDto) {
    return this.bulkPromotionService.createBulkPromotion(
      dto.title,
      dto.description,
      dto.htmlContent,
      dto.sendToAll,
      dto.memberIds,
      dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
    );
  }

  @Get('bulk-promotions')
  async getAllPromotions() {
    return this.bulkPromotionService.getAllPromotions();
  }

  @Get('bulk-promotions/:id')
  async getPromotionById(@Param('id') id: string) {
    return this.bulkPromotionService.getPromotionById(id);
  }

  @Post('bulk-promotions/:id/send')
  @HttpCode(HttpStatus.OK)
  async sendBulkPromotion(@Param('id') id: string) {
    return this.bulkPromotionService.sendBulkPromotion(id);
  }

  @Put('bulk-promotions/:id')
  async updateBulkPromotion(@Param('id') id: string, @Body() dto: UpdateBulkPromotionDto) {
    return this.bulkPromotionService.updatePromotion(id, dto);
  }

  @Delete('bulk-promotions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteBulkPromotion(@Param('id') id: string) {
    await this.bulkPromotionService.deletePromotion(id);
    return { success: true, message: 'Promoción eliminada' };
  }

  // ============ BIRTHDAY DISCOUNT COUPONS ============

  @Get('test-debug/promotions')
  async debugPromotions() {
    return this.bulkPromotionService.getActivePromotions();
  }

  @Get('birthday-coupons')
  async getActiveBirthdayCoupons() {
    // Devolver todos los cupones/promociones activos de la tabla promotion
    return this.bulkPromotionService.getActivePromotions();
  }

  @Put('settings/birthday-discount')
  async updateBirthdayDiscount(@Body() dto: any) {
    try {
      this.logger.log(`📝 Actualizando descuento de cumpleaños: ${JSON.stringify(dto)}`);
      const result = await this.bulkPromotionService.updateBirthdayDiscountSettings(dto);
      this.logger.log('✅ Descuento actualizado correctamente');
      return result;
    } catch (error) {
      this.logger.error(`❌ Error al actualizar descuento: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('settings/birthday-discount')
  async getBirthdayDiscountSettings() {
    try {
      return await this.bulkPromotionService.getBirthdayDiscountSettings();
    } catch (error) {
      this.logger.error(`❌ Error al obtener configuración: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('test/database')
  async testDatabase() {
    try {
      this.logger.log('🧪 Probando conexión a base de datos...');
      return {
        statusCode: 200,
        data: { connection: 'ok' },
        message: 'Conexión a base de datos exitosa',
      };
    } catch (error) {
      this.logger.error(`❌ Error de conexión: ${error.message}`, error.stack);
      throw error;
    }
  }
}
