import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Member } from '../../entities/member.entity';
import { Payment } from '../../entities/payment.entity';
import { Attendance } from '../../entities/attendance.entity';
import { GymSettings } from '../../entities/gym-settings.entity';
import { EmailService } from '../email-settings/email.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { OutboxService } from '../outbox/outbox.service';
import { NotificationPriority } from '../outbox/entities/notification-outbox.entity';
import * as puppeteer from 'puppeteer';

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    @InjectRepository(Member) private memberRepository: Repository<Member>,
    @InjectRepository(Payment) private paymentRepository: Repository<Payment>,
    @InjectRepository(Attendance) private attendanceRepository: Repository<Attendance>,
    @InjectRepository(GymSettings) private gymSettingsRepository: Repository<GymSettings>,
    private emailService: EmailService,
    private whatsappService: WhatsappService,
    private outboxService: OutboxService,
  ) {}

  private isGenerating = false;
  private lastSentDateMap: Record<string, string> = {};

  @Cron(CronExpression.EVERY_MINUTE)
  async handleDailySummaryCron() {
    if (this.isGenerating) {
      return;
    }

    try {
      const now = new Date();
      const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

      // Si ya se envió hoy para este horario, no re-procesar
      if (this.lastSentDateMap[timeString] === todayKey) {
        return;
      }

      const settingsList = await this.gymSettingsRepository.find({ order: { updatedAt: 'DESC' }, take: 1 });
      if (!settingsList.length) return;
      
      const settings = settingsList[0];
      if (settings.enableDailySummaryReport === false) {
        return;
      }
      const time1 = settings.closingReportTime1 || '12:00';
      const time2 = settings.closingReportTime2 || '21:00';

      if (timeString === time1 || timeString === time2) {
        this.logger.log(`Es la hora programada (${timeString}) para el reporte diario...`);
        this.lastSentDateMap[timeString] = todayKey;
        await this.generateAndSendDailySummary(settings);
      }
    } catch (error) {
      this.logger.error('Error al ejecutar cron job de resumen diario:', error);
    }
  }

  async generateAndSendDailySummary(passedSettings?: GymSettings) {
    this.isGenerating = true;
    try {
      const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 1. Obtener Estadísticas
    const todayPayments = await this.paymentRepository.find({ where: { paymentDate: Between(today, tomorrow) } });
    const yesterdayPayments = await this.paymentRepository.find({ where: { paymentDate: Between(yesterday, today) } });
    
    const totalIncomeToday = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalIncomeYesterday = yesterdayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const incomeDiff = totalIncomeToday - totalIncomeYesterday;
    const incomeStatus = incomeDiff >= 0 ? 'subido' : 'bajado';
    const incomeColor = incomeDiff >= 0 ? '#4CAF50' : '#F44336';

    const newMembers = await this.memberRepository.count({ where: { createdAt: Between(today, tomorrow) } });
    const totalVisits = await this.attendanceRepository.count({ where: { visitDate: Between(today, tomorrow) } });

    // 2. Crear Gráfico con QuickChart
    const chartUrl = `https://quickchart.io/chart?c={type:'bar',data:{labels:['Ayer','Hoy'],datasets:[{label:'Ingresos',data:[${totalIncomeYesterday},${totalIncomeToday}],backgroundColor:['#888888','${incomeColor}']}]}}`;

    // 3. Generar HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .title { font-size: 28px; color: #2c3e50; font-weight: bold; margin: 0; }
          .date { font-size: 16px; color: #7f8c8d; margin-top: 10px; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; }
          .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
          .stat-title { font-size: 14px; color: #95a5a6; text-transform: uppercase; letter-spacing: 1px; }
          .stat-value { font-size: 32px; font-weight: bold; color: #2c3e50; margin: 10px 0; }
          .income-trend { font-size: 16px; font-weight: bold; color: ${incomeColor}; }
          .chart-container { text-align: center; margin-top: 40px; border: 1px solid #eee; padding: 20px; border-radius: 8px; }
          .chart-img { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Cierre de Caja - Resumen Diario</h1>
          <div class="date">${today.toLocaleDateString()} a las ${new Date().toLocaleTimeString()}</div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-title">Ingresos Totales</div>
            <div class="stat-value">$${totalIncomeToday.toFixed(2)}</div>
            <div class="income-trend">
              ${incomeDiff >= 0 ? '▲' : '▼'} Han ${incomeStatus} $${Math.abs(incomeDiff).toFixed(2)}
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Nuevos Miembros</div>
            <div class="stat-value">${newMembers}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Visitas Hoy</div>
            <div class="stat-value">${totalVisits}</div>
          </div>
        </div>

        <div class="chart-container">
          <h3 style="color: #2c3e50;">Comparativa de Ingresos</h3>
          <img src="${chartUrl}" class="chart-img" />
        </div>
      </body>
      </html>
    `;

    // 4. Generar PDF
    this.logger.log('Generando PDF del reporte...');
    let browser: any = null;
    let pdfBuffer: Buffer;
    try {
      browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
      pdfBuffer = Buffer.from(await page.pdf({ format: 'A4', printBackground: true }));
    } catch (pdfErr) {
      this.logger.error('Error al renderizar PDF con Puppeteer:', pdfErr);
      throw pdfErr;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (closeErr) {
          this.logger.warn('Error cerrando navegador Puppeteer:', closeErr);
        }
      }
    }
    
    // 5. Enviar a Destinatarios
    let settings = passedSettings;
    if (!settings) {
      const settingsList = await this.gymSettingsRepository.find({ order: { updatedAt: 'DESC' }, take: 1 });
      if (!settingsList.length) return;
      settings = settingsList[0];
    }
    const recipients = settings.closingReportRecipients || [];

    for (const recipient of recipients) {
      if (recipient.sendEmail && recipient.email) {
        try {
          const base64Data = Buffer.from(pdfBuffer).toString('base64');
          await this.outboxService.enqueueEmail({
            recipient: recipient.email,
            recipientName: recipient.name,
            subject: `Resumen de Cierre de Caja - ${today.toLocaleDateString()}`,
            content: 'Adjunto enviamos el resumen detallado del día.',
            htmlContent: '<p>Adjunto enviamos el resumen detallado del día.</p>',
            priority: NotificationPriority.HIGH,
            attachments: [{
              filename: `Resumen_${today.toLocaleDateString().replace(/\//g, '-')}.pdf`,
              content: base64Data,
              contentType: 'application/pdf',
            }],
            metadata: { source: 'daily_summary', recipientName: recipient.name },
          });
          this.logger.log(`Reporte diario encolado en Outbox para Email: ${recipient.email}`);
        } catch (e) {
          this.logger.error(`Error encolando correo a ${recipient.email}:`, e);
        }
      }

      if (recipient.sendWhatsapp && recipient.phone) {
        try {
          const base64Data = Buffer.from(pdfBuffer).toString('base64');
          await this.outboxService.enqueueWhatsappPdf({
            recipient: recipient.phone,
            filename: `Resumen_${today.toLocaleDateString().replace(/\//g, '-')}.pdf`,
            base64Data,
            caption: `Resumen Diario - Ingresos: $${totalIncomeToday.toFixed(2)} (${incomeDiff >= 0 ? '▲' : '▼'})`,
            priority: NotificationPriority.HIGH,
            metadata: { source: 'daily_summary', recipientName: recipient.name },
          });
          this.logger.log(`Reporte diario encolado en Outbox para WhatsApp: ${recipient.phone}`);
        } catch (e) {
          this.logger.error(`Error encolando reporte para WhatsApp a ${recipient.phone}:`, e);
        }
      }
    }
  } finally {
    this.isGenerating = false;
  }
}
}
