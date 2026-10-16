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
import { FinancialAnalyticsService, FinancialAnalyticsDto } from './financial-analytics.service';
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
    private financialAnalyticsService: FinancialAnalyticsService,
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

      // 1. Obtener Estadísticas de Hoy vs Ayer
      const todayPayments = await this.paymentRepository.find({ where: { paymentDate: Between(today, tomorrow) } });
      const yesterdayPayments = await this.paymentRepository.find({ where: { paymentDate: Between(yesterday, today) } });
      
      const totalIncomeToday = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalIncomeYesterday = yesterdayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const incomeDiff = totalIncomeToday - totalIncomeYesterday;

      const newMembers = await this.memberRepository.count({ where: { createdAt: Between(today, tomorrow) } });
      const totalVisits = await this.attendanceRepository.count({ where: { visitDate: Between(today, tomorrow) } });

      // 2. Obtener Inteligencia Financiera Global del Mes en Curso
      let analytics: FinancialAnalyticsDto;
      try {
        analytics = await this.financialAnalyticsService.getFinancialAndBehaviorAnalytics('monthly');
      } catch (err) {
        this.logger.warn('Error al calcular analíticas financieras para el reporte:', err);
        analytics = {
          period: { startDate: '', endDate: '', range: 'monthly' },
          financial: {
            totalRevenue: totalIncomeToday,
            membershipRevenue: totalIncomeToday,
            posSalesRevenue: 0,
            totalExpenses: 0,
            payrollExpenses: 0,
            operationalExpenses: 0,
            cashWithdrawals: 0,
            netProfit: totalIncomeToday,
            profitMarginPercent: 100,
            payrollRatioPercent: 0,
          },
          behavior: {
            totalCheckins: totalVisits,
            peakHours: { morningCheckins: 0, afternoonCheckins: 0, eveningCheckins: 0, busiestTimeSlot: 'N/A', busiestPercentage: 0 },
            weekdays: [],
            membersStats: { totalMembers: 0, activeMembers: 0, expiredRecentMembers: 0, retentionRatePercent: 0, averageRevenuePerActiveMember: 0 },
          },
          recommendations: [],
        };
      }

      const fmt = (val: number) => `RD$ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // 3. Crear Gráfico con QuickChart estilo Dashboard
      const chartConfig = {
        type: 'bar',
        data: {
          labels: ['Membresías', 'Tienda POS', 'Nómina', 'Gastos Operativos', 'Ganancia Neta'],
          datasets: [{
            label: 'RD$',
            data: [
              analytics.financial.membershipRevenue,
              analytics.financial.posSalesRevenue,
              analytics.financial.payrollExpenses,
              analytics.financial.operationalExpenses + analytics.financial.cashWithdrawals,
              analytics.financial.netProfit,
            ],
            backgroundColor: ['#2563EB', '#3B82F6', '#EF4444', '#F97316', '#10B981'],
            borderRadius: 6,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { font: { size: 9 } } },
            x: { ticks: { font: { size: 9, weight: 'bold' } } },
          },
        },
      };
      const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=560&h=200`;

      // Cálculos porcentuales de franja horaria
      const totalMorning = analytics.behavior.peakHours.morningCheckins || 0;
      const totalAfternoon = analytics.behavior.peakHours.afternoonCheckins || 0;
      const totalEvening = analytics.behavior.peakHours.eveningCheckins || 0;
      const totalSlots = (totalMorning + totalAfternoon + totalEvening) || 1;
      const pctM = Math.round((totalMorning / totalSlots) * 100);
      const pctA = Math.round((totalAfternoon / totalSlots) * 100);
      const pctE = Math.round((totalEvening / totalSlots) * 100);

      const topRecs = (analytics.recommendations || []).slice(0, 3);

      // 4. Generar HTML Ejecutivo para el PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 24px; size: A4 portrait; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1F2937;
              background: #FFFFFF;
              margin: 0;
              padding: 0;
              font-size: 11px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #E5E7EB;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand-title {
              font-size: 20px;
              font-weight: 800;
              color: #111827;
              letter-spacing: -0.5px;
            }
            .brand-subtitle {
              font-size: 11px;
              color: #6B7280;
              margin-top: 2px;
            }
            .header-meta {
              text-align: right;
              font-size: 10px;
              color: #4B5563;
            }
            .badge-tag {
              display: inline-block;
              background: #EFF6FF;
              color: #1D4ED8;
              font-weight: 700;
              padding: 3px 8px;
              border-radius: 4px;
              font-size: 10px;
              margin-bottom: 4px;
            }

            .section-title {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #374151;
              letter-spacing: 0.5px;
              margin: 14px 0 8px 0;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .section-title::before {
              content: '';
              display: inline-block;
              width: 4px;
              height: 12px;
              background: #2563EB;
              border-radius: 2px;
            }

            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 10px;
            }
            .card {
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 10px 12px;
            }
            .card-label {
              font-size: 10px;
              color: #6B7280;
              text-transform: uppercase;
              font-weight: 600;
            }
            .card-value {
              font-size: 18px;
              font-weight: 800;
              color: #111827;
              margin: 4px 0 2px 0;
            }
            .card-subtext {
              font-size: 10px;
              font-weight: 600;
            }
            .text-success { color: #059669; }
            .text-danger { color: #DC2626; }
            .text-primary { color: #2563EB; }

            .fin-container {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 10px;
              background: #F3F4F6;
              padding: 10px;
              border-radius: 8px;
              border: 1px solid #E5E7EB;
            }
            .fin-col {
              background: #FFFFFF;
              padding: 10px;
              border-radius: 6px;
              border-left: 4px solid #CBD5E1;
            }
            .fin-col.revenue { border-left-color: #2563EB; }
            .fin-col.expenses { border-left-color: #EF4444; }
            .fin-col.profit { border-left-color: #10B981; }
            .fin-item {
              display: flex;
              justify-content: space-between;
              margin-top: 4px;
              font-size: 10px;
              color: #4B5563;
            }
            .fin-item strong { color: #111827; }

            .peak-bar-container {
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 10px 12px;
            }
            .bar-progress {
              display: flex;
              height: 14px;
              border-radius: 7px;
              overflow: hidden;
              margin: 6px 0;
              background: #E5E7EB;
            }
            .bar-seg {
              height: 100%;
              text-align: center;
              color: #FFFFFF;
              font-size: 8px;
              font-weight: bold;
              line-height: 14px;
            }
            .bar-morning { background: #3B82F6; width: ${pctM}%; }
            .bar-afternoon { background: #F59E0B; width: ${pctA}%; }
            .bar-evening { background: #8B5CF6; width: ${pctE}%; }
            
            .legend-row {
              display: flex;
              justify-content: space-around;
              font-size: 10px;
              margin-top: 4px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              display: inline-block;
            }

            .rec-card {
              background: #EFF6FF;
              border: 1px solid #BFDBFE;
              border-radius: 6px;
              padding: 7px 10px;
              margin-bottom: 5px;
              display: flex;
              gap: 8px;
              align-items: flex-start;
            }
            .rec-badge {
              background: #DC2626;
              color: white;
              font-size: 8px;
              font-weight: 800;
              padding: 2px 6px;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .rec-badge.medium { background: #D97706; }
            .rec-title {
              font-weight: 700;
              color: #1E3A8A;
              font-size: 11px;
            }
            .rec-desc {
              color: #1E40AF;
              font-size: 10px;
              margin-top: 2px;
              line-height: 1.3;
            }

            .chart-box {
              text-align: center;
              margin-top: 10px;
              background: #F9FAFB;
              border: 1px solid #E5E7EB;
              border-radius: 8px;
              padding: 8px;
            }

            .footer {
              margin-top: 12px;
              padding-top: 8px;
              border-top: 1px solid #E5E7EB;
              text-align: center;
              font-size: 9px;
              color: #9CA3AF;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <div>
              <div class="badge-tag">REPORTE FINANCIERO &amp; INTELIGENCIA OPERATIVA</div>
              <div class="brand-title">Gym Manager Intelligence</div>
              <div class="brand-subtitle">Resumen Ejecutivo de Rendimiento, Flujo de Caja y Comportamiento</div>
            </div>
            <div class="header-meta">
              <div><strong>Corte:</strong> ${today.toLocaleDateString()} a las ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              <div><strong>Periodo:</strong> Mes en Curso &amp; Comparativa Diaria</div>
              <div style="color: #059669; font-weight: bold;">● Sistema Activo</div>
            </div>
          </div>

          <!-- 1. Cierre Diario -->
          <div class="section-title">Rendimiento Inmediato de Hoy</div>
          <div class="grid-3">
            <div class="card">
              <div class="card-label">Ingresos de Hoy</div>
              <div class="card-value">${fmt(totalIncomeToday)}</div>
              <div class="card-subtext ${incomeDiff >= 0 ? 'text-success' : 'text-danger'}">
                ${incomeDiff >= 0 ? '▲ +' : '▼ -'}${fmt(Math.abs(incomeDiff))} vs ayer
              </div>
            </div>
            <div class="card">
              <div class="card-label">Nuevas Inscripciones</div>
              <div class="card-value">${newMembers}</div>
              <div class="card-subtext text-primary">Miembros registrados hoy</div>
            </div>
            <div class="card">
              <div class="card-label">Visitas / Accesos Hoy</div>
              <div class="card-value">${totalVisits}</div>
              <div class="card-subtext" style="color: #6B7280;">Check-ins en torniquete</div>
            </div>
          </div>

          <!-- 2. Visión Financiera Global -->
          <div class="section-title">Inteligencia Financiera del Periodo (Mes en Curso)</div>
          <div class="fin-container">
            <div class="fin-col revenue">
              <div class="card-label">Ingresos Totales</div>
              <div class="card-value text-primary">${fmt(analytics.financial.totalRevenue)}</div>
              <div class="fin-item"><span>Membresías:</span> <strong>${fmt(analytics.financial.membershipRevenue)}</strong></div>
              <div class="fin-item"><span>Tienda / POS:</span> <strong>${fmt(analytics.financial.posSalesRevenue)}</strong></div>
            </div>

            <div class="fin-col expenses">
              <div class="card-label">Gastos Totales</div>
              <div class="card-value text-danger">${fmt(analytics.financial.totalExpenses)}</div>
              <div class="fin-item"><span>Nómina:</span> <strong>${fmt(analytics.financial.payrollExpenses)}</strong></div>
              <div class="fin-item"><span>Operativos/Caja:</span> <strong>${fmt(analytics.financial.operationalExpenses + analytics.financial.cashWithdrawals)}</strong></div>
            </div>

            <div class="fin-col profit">
              <div class="card-label">Beneficio Neto</div>
              <div class="card-value text-success">${fmt(analytics.financial.netProfit)}</div>
              <div class="fin-item"><span>Margen de Ganancia:</span> <strong>${analytics.financial.profitMarginPercent.toFixed(1)}%</strong></div>
              <div class="fin-item"><span>Carga de Nómina:</span> <strong>${analytics.financial.payrollRatioPercent.toFixed(1)}%</strong></div>
            </div>
          </div>

          <!-- 3. Horas Pico y Socios -->
          <div class="section-title">Comportamiento de Asistencia &amp; Horas Pico</div>
          <div class="grid-3" style="grid-template-columns: 2fr 1fr;">
            <div class="peak-bar-container">
              <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 10px;">
                <span>Distribución por Franja Horaria</span>
                <span class="text-primary">Pico: ${analytics.behavior.peakHours.busiestTimeSlot}</span>
              </div>
              <div class="bar-progress">
                <div class="bar-seg bar-morning">${pctM}%</div>
                <div class="bar-seg bar-afternoon">${pctA}%</div>
                <div class="bar-seg bar-evening">${pctE}%</div>
              </div>
              <div class="legend-row">
                <div class="legend-item"><span class="dot" style="background:#3B82F6;"></span> Mañana (${totalMorning})</div>
                <div class="legend-item"><span class="dot" style="background:#F59E0B;"></span> Tarde (${totalAfternoon})</div>
                <div class="legend-item"><span class="dot" style="background:#8B5CF6;"></span> Noche (${totalEvening})</div>
              </div>
            </div>

            <div class="card">
              <div class="card-label">Retención de Socios</div>
              <div class="card-value text-success">${analytics.behavior.membersStats.retentionRatePercent.toFixed(1)}%</div>
              <div class="fin-item"><span>Activos:</span> <strong>${analytics.behavior.membersStats.activeMembers}</strong></div>
              <div class="fin-item"><span>Vencidos:</span> <strong class="text-danger">${analytics.behavior.membersStats.expiredRecentMembers}</strong></div>
            </div>
          </div>

          <!-- 4. Gráfico Comparativo -->
          <div class="chart-box">
            <img src="${chartUrl}" style="max-width: 100%; height: auto; border-radius: 4px;" />
          </div>

          <!-- 5. Recomendaciones Predictivas -->
          ${topRecs.length > 0 ? `
            <div class="section-title">Recomendaciones Automatizadas del Negocio</div>
            ${topRecs.map(r => `
              <div class="rec-card">
                <span class="rec-badge ${r.priority === 'HIGH' ? '' : 'medium'}">${r.priority === 'HIGH' ? 'ALTA' : 'MEDIA'}</span>
                <div>
                  <div class="rec-title">${r.title} <span style="font-size: 9px; color: #6B7280; font-weight: normal;">[${r.category}]</span></div>
                  <div class="rec-desc">${r.description}</div>
                </div>
              </div>
            `).join('')}
          ` : ''}

          <div class="footer">
            Generado automáticamente por el motor de análisis de Gym Manager • Documento confidencial para administración
          </div>
        </body>
        </html>
      `;

      // 5. Generar PDF con Puppeteer
      this.logger.log('Generando PDF del reporte ejecutivo...');
      let browser: any = null;
      let pdfBuffer: Buffer;
      try {
        browser = await puppeteer.launch({ 
          headless: true, 
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        const page = await browser.newPage();
        try {
          await page.setContent(htmlContent, { waitUntil: 'networkidle2', timeout: 7000 });
        } catch (_) {
          await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
        }
        const rawPdf = await page.pdf({ 
          format: 'A4', 
          printBackground: true,
          margin: { top: '15px', right: '15px', bottom: '15px', left: '15px' },
        });
        pdfBuffer = Buffer.from(rawPdf);
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
      
      // 6. Enviar a Destinatarios
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
            const base64Data = pdfBuffer.toString('base64');
            await this.outboxService.enqueueEmail({
              recipient: recipient.email,
              recipientName: recipient.name,
              subject: `📊 Resumen Ejecutivo y Cierre de Caja - ${today.toLocaleDateString()}`,
              content: `Resumen de Cierre de Caja del ${today.toLocaleDateString()}.\nIngresos Hoy: ${fmt(totalIncomeToday)}\nGanancia Neta Periodo: ${fmt(analytics.financial.netProfit)}\nSocios Activos: ${analytics.behavior.membersStats.activeMembers}`,
              htmlContent: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
                  <h2 style="color: #1E3A8A;">Resumen Ejecutivo & Cierre de Caja</h2>
                  <p>Adjunto encontrarás el informe detallado de inteligencia financiera, ingresos, nómina, horas pico y recomendaciones para la toma de decisiones.</p>
                  <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <tr><td style="padding: 6px; border-bottom: 1px solid #ddd;"><strong>Ingresos Hoy:</strong></td><td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right; color: #059669;"><strong>${fmt(totalIncomeToday)}</strong></td></tr>
                    <tr><td style="padding: 6px; border-bottom: 1px solid #ddd;"><strong>Ganancia Neta (Mes):</strong></td><td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right; color: #2563EB;"><strong>${fmt(analytics.financial.netProfit)}</strong></td></tr>
                    <tr><td style="padding: 6px; border-bottom: 1px solid #ddd;"><strong>Socios Activos:</strong></td><td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${analytics.behavior.membersStats.activeMembers}</td></tr>
                    <tr><td style="padding: 6px; border-bottom: 1px solid #ddd;"><strong>Visitas de Hoy:</strong></td><td style="padding: 6px; border-bottom: 1px solid #ddd; text-align: right;">${totalVisits} check-ins</td></tr>
                  </table>
                  <p style="font-size: 12px; color: #666;">Generado automáticamente por Gym Manager.</p>
                </div>
              `,
              priority: NotificationPriority.HIGH,
              attachments: [{
                filename: `Reporte_Ejecutivo_${today.toLocaleDateString().replace(/\//g, '-')}.pdf`,
                content: base64Data,
                encoding: 'base64',
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
            const base64Data = pdfBuffer.toString('base64');
            const waCaption = `📊 *Reporte Ejecutivo & Cierre de Caja*\n` +
              `📅 *Fecha:* ${today.toLocaleDateString()}\n` +
              `💰 *Ingresos Hoy:* ${fmt(totalIncomeToday)} (${incomeDiff >= 0 ? '▲ +' : '▼ -'}${fmt(Math.abs(incomeDiff))})\n` +
              `📈 *Ganancia Neta Mes:* ${fmt(analytics.financial.netProfit)} (Margen: ${analytics.financial.profitMarginPercent.toFixed(1)}%)\n` +
              `👥 *Socios Activos:* ${analytics.behavior.membersStats.activeMembers} | *Visitas Hoy:* ${totalVisits}\n` +
              `⏰ *Horario Pico:* ${analytics.behavior.peakHours.busiestTimeSlot}\n\n` +
              `_Se adjunta documento PDF con análisis detallado de gastos, nómina y recomendaciones predictivas._`;

            await this.outboxService.enqueueWhatsappPdf({
              recipient: recipient.phone,
              filename: `Reporte_Ejecutivo_${today.toLocaleDateString().replace(/\//g, '-')}.pdf`,
              base64Data,
              caption: waCaption,
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
