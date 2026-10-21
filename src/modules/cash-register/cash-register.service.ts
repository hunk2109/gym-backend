import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CashRegister } from '../../entities/cash-register.entity';
import { Sale } from '../../entities/sale.entity';
import { Payment } from '../../entities/payment.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { OpenCashRegisterDto, CloseCashRegisterDto } from './dto/cash-register.dto';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { EmailService } from '../email-settings/email.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import { normalizeClosingReportRecipients } from '../gym-settings/utils/recipient.util';

@Injectable()
export class CashRegisterService {
  constructor(
    @InjectRepository(CashRegister)
    private cashRegisterRepository: Repository<CashRegister>,
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private auditLogService: AuditLogService,
    private whatsappService: WhatsappService,
    private emailService: EmailService,
    private gymSettingsService: GymSettingsService,
  ) {}

  async openCashRegister(userId: string, dto: OpenCashRegisterDto): Promise<CashRegister> {
    try {
      console.log('[CashRegisterService] openCashRegister called with userId:', userId);
      console.log('[CashRegisterService] DTO:', JSON.stringify(dto));

      if (!userId) {
        throw new Error('userId is required');
      }

      if (dto.openingAmount === null || dto.openingAmount === undefined) {
        throw new Error('openingAmount is required');
      }

      console.log('[CashRegisterService] Verificando cajas abiertas...');
      
      // Buscar CUALQUIER caja abierta para este usuario
      const openRegister = await this.cashRegisterRepository.findOne({
        where: {
          userId,
          isOpen: true,
        },
      });

      // Si existe una abierta, cerrarla primero
      if (openRegister) {
        console.log('[CashRegisterService] Found open register:', openRegister.id, '. Closing it...');
        openRegister.isOpen = false;
        openRegister.closedAt = new Date();
        await this.cashRegisterRepository.save(openRegister);
        console.log('[CashRegisterService] ✓ Previous register closed');
      }

      console.log('[CashRegisterService] Creating new cash register with amount:', dto.openingAmount);

      const cashRegister = this.cashRegisterRepository.create({
        userId,
        registerDate: new Date(),
        openingAmount: Number(dto.openingAmount),
        openingBillBreakdown: JSON.stringify(dto.billBreakdown || {}),
        openingReceipts: JSON.stringify(dto.receipts || []),
        isOpen: true,
      });

      console.log('[CashRegisterService] Saving new register...');
      
      const saved = await this.cashRegisterRepository.save(cashRegister);
      
      // Registrar en auditoría
      await this.auditLogService.create({
        action: 'CASH_REGISTER_OPEN',
        module: 'CASH_REGISTER',
        description: `Caja abierta: RD$ ${dto.openingAmount}`,
        userId,
        newValue: { openingAmount: dto.openingAmount },
      });

      console.log('[CashRegisterService] ✓ Cash register saved successfully:', saved.id);
      return saved;
    } catch (error) {
      console.error('[CashRegisterService] ❌ Error in openCashRegister:', error);
      console.error('[CashRegisterService] Error message:', error.message);
      throw error;
    }
  }

  async closeCashRegister(userId: string, dto: CloseCashRegisterDto): Promise<CashRegister> {
    try {
      console.log('[CashRegisterService] closeCashRegister called with userId:', userId);

      if (!userId) {
        throw new Error('userId is required');
      }

      if (dto.closingAmount === null || dto.closingAmount === undefined) {
        throw new Error('closingAmount is required');
      }

      console.log('[CashRegisterService] Finding open register for user:', userId);

      const cashRegister = await this.cashRegisterRepository.findOne({
        where: {
          userId,
          isOpen: true,
        },
      });

      if (!cashRegister) {
        throw new Error('No existe una caja abierta para este usuario');
      }

      // Parsear la fecha correctamente (registerDate es "2025-12-05")
      const dateStr = typeof cashRegister.registerDate === 'string' 
        ? cashRegister.registerDate 
        : (cashRegister.registerDate as Date).toISOString().split('T')[0];
      
      const [year, month, day] = dateStr.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      // Obtener total de ventas en efectivo del turno para esta caja
      const cashSalesQuery = await this.saleRepository.query(
        `SELECT COALESCE(SUM(totalAmount - discount), 0) as total FROM sales 
         WHERE status = 'completed' AND (paymentMethod = 'cash' OR paymentMethod = '' OR paymentMethod IS NULL) AND (cashRegisterId = ? OR (cashRegisterId IS NULL AND createdAt >= ? AND createdAt <= ?))`,
        [cashRegister.id, startOfDay, endOfDay]
      );
      const totalCashSales = Number(cashSalesQuery[0]?.total || 0);
      console.log('[CashRegisterService] Total cash sales for shift:', totalCashSales);

      // Obtener total de pagos de membresías en efectivo del turno para esta caja
      const cashPaymentsQuery = await this.paymentRepository.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE status = 'completed' AND (paymentMethod = 'cash' OR paymentMethod = '' OR paymentMethod IS NULL) AND (cashRegisterId = ? OR (cashRegisterId IS NULL AND createdAt >= ? AND createdAt <= ?))`,
        [cashRegister.id, startOfDay, endOfDay]
      );
      const totalCashPayments = Number(cashPaymentsQuery[0]?.total || 0);
      console.log('[CashRegisterService] Total cash membership payments for shift:', totalCashPayments);

      // Obtener total de transacciones manuales (entradas y salidas de caja)
      const transactionsQuery = await this.cashRegisterRepository.query(
        `SELECT COALESCE(SUM(CASE WHEN type = 'in' THEN amount ELSE -amount END), 0) as total FROM cash_register_transactions
         WHERE cashRegisterId = ?`,
        [cashRegister.id]
      );
      
      const totalTransactions = Number(transactionsQuery[0]?.total || 0);
      console.log('[CashRegisterService] Total manual transactions:', totalTransactions);

      // Calcular lo que debería haber en la gaveta física: Apertura + Ventas Efectivo + Pagos Membresía Efectivo + Transacciones
      const expectedClosure = Number(cashRegister.openingAmount) + totalCashSales + totalCashPayments + totalTransactions;
      console.log('[CashRegisterService] Opening:', cashRegister.openingAmount, '+ Cash Sales:', totalCashSales, '+ Cash Payments:', totalCashPayments, '+ Tx:', totalTransactions, '= Expected Cash:', expectedClosure);

      // Calcular diferencia
      const difference = Number(dto.closingAmount) - expectedClosure;
      console.log('[CashRegisterService] Closing amount:', dto.closingAmount, '- Expected:', expectedClosure, '= Difference:', difference);

      // Validación: diferencia mayor a RD$100 es sospechosa
      const severity = Math.abs(difference) > 100 ? 'WARNING' : 'INFO';

      cashRegister.closingAmount = Number(dto.closingAmount);
      cashRegister.closingBillBreakdown = JSON.stringify(dto.billBreakdown || {});
      cashRegister.closingReceipts = JSON.stringify(dto.receipts || []);
      cashRegister.expectedClosure = expectedClosure;
      cashRegister.difference = difference;
      cashRegister.isOpen = false;
      cashRegister.closedAt = new Date();

      console.log('[CashRegisterService] Saving closed cash register...');
      const saved = await this.cashRegisterRepository.save(cashRegister);
      
      // Vincular ventas del día a este cierre de caja
      console.log('[CashRegisterService] Linking sales and payments to this cash register...');
      await this.saleRepository.query(
        `UPDATE sales SET cashRegisterId = ? WHERE (cashRegisterId = ? OR (cashRegisterId IS NULL AND createdAt >= ? AND createdAt <= ?))`,
        [saved.id, saved.id, startOfDay, endOfDay]
      );

      // Vincular pagos de membresías a este cierre de caja
      await this.paymentRepository.query(
        `UPDATE payments SET cashRegisterId = ? WHERE (cashRegisterId = ? OR (cashRegisterId IS NULL AND createdAt >= ? AND createdAt <= ?))`,
        [saved.id, saved.id, startOfDay, endOfDay]
      );

      // Registrar en auditoría
      await this.auditLogService.create({
        action: 'CASH_REGISTER_CLOSE',
        module: 'CASH_REGISTER',
        description: `Caja cerrada: Esperado RD$ ${expectedClosure}, Cierre RD$ ${dto.closingAmount}, Diferencia RD$ ${difference}`,
        userId,
        newValue: { closingAmount: dto.closingAmount, difference },
      });

      console.log('[CashRegisterService] ✓ Cash register closed successfully in DB');

      // Enviar reporte automático por correo y WhatsApp a los destinatarios configurados
      try {
        console.log('[CashRegisterService] 📧 Dispatching closing report notifications...');
        await this.sendClosingReportDirect(saved, {
          userId,
          totalCashSales,
          totalCashPayments,
          totalTransactions,
          expectedClosure,
          difference,
          billBreakdown: dto.billBreakdown,
        });
      } catch (notifyErr) {
        console.error('[CashRegisterService] ⚠️ Error sending closing report notification:', notifyErr);
      }

      return saved;
    } catch (error) {
      console.error('[CashRegisterService] ❌ Error in closeCashRegister:', error);
      throw error;
    }
  }

  async sendClosingReportDirect(
    register: CashRegister,
    details: {
      userId: string;
      totalCashSales: number;
      totalCashPayments: number;
      totalTransactions: number;
      expectedClosure: number;
      difference: number;
      billBreakdown?: any;
    },
  ): Promise<void> {
    try {
      const settings = await this.gymSettingsService.getSettings();
      const channel = settings?.notificationChannel || 'both';
      const recipients = normalizeClosingReportRecipients(settings?.closingReportRecipients, channel);
      if (recipients.length === 0) {
        console.log('[CashRegisterService] No closing report recipients configured, skipping.');
        return;
      }

      const gymName = settings.gymName || 'Gym Manager';
      const currency = (val: number) => `RD$ ${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

      // Obtener datos del cajero
      let cashierName = 'Cajero';
      try {
        const users = await this.cashRegisterRepository.query(
          'SELECT firstName, lastName, email FROM users WHERE id = ?',
          [details.userId]
        );
        if (users && users[0]) {
          cashierName = `${users[0].firstName || ''} ${users[0].lastName || ''}`.trim() || users[0].email || 'Cajero';
        }
      } catch (e) {
        console.warn('[CashRegisterService] Could not fetch cashier name:', e);
      }

      const closedDate = register.closedAt ? new Date(register.closedAt) : new Date();
      const openDate = register.registerDate ? new Date(register.registerDate) : new Date();
      const dateFormatted = closedDate.toLocaleDateString('es-DO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeFormatted = closedDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });
      const openTimeFormatted = openDate.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true });

      const diff = details.difference;
      let statusBadgeText = 'CUADRE PERFECTO';
      let statusBadgeColor = '#28a745';
      let statusBadgeBg = '#d4edda';
      if (diff > 0.01) {
        statusBadgeText = `SOBRANTE (+${currency(diff)})`;
        statusBadgeColor = '#17a2b8';
        statusBadgeBg = '#d1ecf1';
      } else if (diff < -0.01) {
        statusBadgeText = `FALTANTE (-${currency(Math.abs(diff))})`;
        statusBadgeColor = '#dc3545';
        statusBadgeBg = '#f8d7da';
      }

      // Desglose de billetes
      let breakdownRows = '';
      let textBreakdown = '';
      if (details.billBreakdown && typeof details.billBreakdown === 'object') {
        const denoms = [2000, 1000, 500, 200, 100, 50, 25, 10, 5, 1];
        let hasDenoms = false;
        for (const d of denoms) {
          const count = Number(details.billBreakdown[d] || details.billBreakdown[String(d)] || 0);
          if (count > 0) {
            hasDenoms = true;
            const subtotal = d * count;
            breakdownRows += `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef;">RD$ ${d.toLocaleString()}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; text-align: center;">${count}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e9ecef; text-align: right; font-weight: bold;">${currency(subtotal)}</td>
              </tr>
            `;
            textBreakdown += `• RD$ ${d} x ${count} = ${currency(subtotal)}\n`;
          }
        }
        if (!hasDenoms) {
          breakdownRows = '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #6c757d;">Conteo global directo (sin desglose específico)</td></tr>';
        }
      } else {
        breakdownRows = '<tr><td colspan="3" style="padding: 10px; text-align: center; color: #6c757d;">Conteo global directo</td></tr>';
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
            .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
            .badge-container { text-align: center; margin: 18px 0; }
            .badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; color: ${statusBadgeColor}; background-color: ${statusBadgeBg}; }
            .section { padding: 0 24px 20px; }
            .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px; }
            .info-grid td { padding: 6px 0; }
            .table-box { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
            .table-box th { background-color: #f8fafc; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; }
            .table-box td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
            .highlight-row { background-color: #f1f5f9; font-weight: bold; }
            .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${gymName}</h1>
              <p>Reporte Oficial de Cierre y Arqueo de Caja</p>
            </div>
            
            <div class="section" style="padding-top: 20px;">
              <div class="badge-container">
                <span class="badge">${statusBadgeText}</span>
              </div>

              <table class="info-grid">
                <tr>
                  <td style="color: #64748b;"><strong>Fecha de Cierre:</strong></td>
                  <td style="text-align: right;">${dateFormatted} a las ${timeFormatted}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;"><strong>Apertura de Caja:</strong></td>
                  <td style="text-align: right;">${openTimeFormatted} (Inicial: ${currency(Number(register.openingAmount))})</td>
                </tr>
                <tr>
                  <td style="color: #64748b;"><strong>Cajero Responsable:</strong></td>
                  <td style="text-align: right;">${cashierName}</td>
                </tr>
              </table>

              <h3 style="margin: 16px 0 8px; font-size: 15px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Resumen del Cuadre</h3>
              <table class="table-box">
                <tr>
                  <td>Monto Apertura (Fondo)</td>
                  <td style="text-align: right;">${currency(Number(register.openingAmount))}</td>
                </tr>
                <tr>
                  <td>Ventas Productos (Efectivo)</td>
                  <td style="text-align: right;">+ ${currency(details.totalCashSales)}</td>
                </tr>
                <tr>
                  <td>Pagos Membresías (Efectivo)</td>
                  <td style="text-align: right;">+ ${currency(details.totalCashPayments)}</td>
                </tr>
                <tr>
                  <td>Entradas / Salidas Manuales</td>
                  <td style="text-align: right;">${details.totalTransactions >= 0 ? '+' : ''} ${currency(details.totalTransactions)}</td>
                </tr>
                <tr class="highlight-row">
                  <td>Total Efectivo Esperado</td>
                  <td style="text-align: right; color: #0284c7;">${currency(details.expectedClosure)}</td>
                </tr>
                <tr class="highlight-row" style="background-color: #f8fafc;">
                  <td>Total Físico Contado</td>
                  <td style="text-align: right; font-size: 14px; color: #0f172a;">${currency(Number(register.closingAmount))}</td>
                </tr>
                <tr style="background-color: ${statusBadgeBg}; font-weight: bold;">
                  <td style="color: ${statusBadgeColor};">Diferencia (Descuadre)</td>
                  <td style="text-align: right; color: ${statusBadgeColor};">${diff >= 0 ? '+' : ''}${currency(diff)}</td>
                </tr>
              </table>

              <h3 style="margin: 22px 0 8px; font-size: 15px; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 4px;">Arqueo Físico (Desglose de Efectivo)</h3>
              <table class="table-box">
                <thead>
                  <tr>
                    <th>Denominación</th>
                    <th style="text-align: center;">Cantidad</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${breakdownRows}
                </tbody>
              </table>
            </div>

            <div class="footer">
              Este reporte fue generado automáticamente por el sistema de gestión ${gymName}.
            </div>
          </div>
        </body>
        </html>
      `;

      const plainText = `*${gymName} - REPORTE DE CIERRE DE CAJA*
Estado: ${statusBadgeText}
Fecha: ${dateFormatted} ${timeFormatted}
Cajero: ${cashierName}

--- RESUMEN FINANCIERO ---
• Fondo de Apertura: ${currency(Number(register.openingAmount))}
• Ventas Efectivo: ${currency(details.totalCashSales)}
• Membresías Efectivo: ${currency(details.totalCashPayments)}
• Movimientos Manuales: ${currency(details.totalTransactions)}
• Efectivo Esperado: ${currency(details.expectedClosure)}
• Efectivo Contado: ${currency(Number(register.closingAmount))}
• Diferencia: ${currency(diff)}

--- DESGLOSE CONTADO ---
${textBreakdown || 'Conteo directo sin desglose'}
`;

      for (const recipient of recipients) {
        // Enviar por Email
        if (recipient.sendEmail && recipient.email) {
          try {
            console.log(`[CashRegisterService] 📧 Sending closing report email to ${recipient.email}`);
            await this.emailService.sendEmailDirect({
              to: recipient.email,
              subject: `Cierre de Caja - ${gymName} [${statusBadgeText}] - ${dateFormatted}`,
              text: plainText,
              html: htmlContent,
            });
            console.log(`[CashRegisterService] ✓ Closing report email delivered to ${recipient.email}`);
          } catch (e) {
            console.error(`[CashRegisterService] ❌ Failed to send closing email to ${recipient.email}:`, e);
          }
        }

        // Enviar por WhatsApp si configurado
        if (recipient.sendWhatsapp && recipient.phone) {
          try {
            if (this.whatsappService.isConnected()) {
              console.log(`[CashRegisterService] 📲 Sending closing report WhatsApp to ${recipient.phone}`);
              await this.whatsappService.sendMessage(recipient.phone, plainText);
              console.log(`[CashRegisterService] ✓ WhatsApp message sent to ${recipient.phone}`);
            } else {
              console.warn(`[CashRegisterService] WhatsApp not connected, could not send to ${recipient.phone}`);
            }
          } catch (we) {
            console.error(`[CashRegisterService] ❌ Failed to send WhatsApp to ${recipient.phone}:`, we);
          }
        }
      }
    } catch (err) {
      console.error('[CashRegisterService] Error in sendClosingReportDirect:', err);
    }
  }

  async sendPdfReport(base64Pdf: string): Promise<void> {
    try {
      const settings = await this.gymSettingsService.getSettings();
      const channel = settings?.notificationChannel || 'both';
      const recipients = normalizeClosingReportRecipients(settings?.closingReportRecipients, channel);
      if (recipients.length === 0) {
        console.log('[CashRegisterService] No closing report recipients configured, skipping.');
        return;
      }

      const filename = `Cierre_Caja_${new Date().toISOString().slice(0, 10)}.pdf`;
      const summaryText = `*Reporte de Cierre de Caja*\nSe adjunta el recibo del cierre de caja.\n_Generado por Gym Manager_`;
      const summaryHtml = `<h2>Reporte de Cierre de Caja</h2><p>Se adjunta el recibo del cierre de caja generado por Gym Manager.</p>`;

      const pdfBuffer = Buffer.from(base64Pdf, 'base64');

      for (const recipient of recipients) {
        if (recipient.sendWhatsapp && recipient.phone) {
          try {
            await this.whatsappService.sendBase64Pdf(
              recipient.phone,
              base64Pdf,
              filename,
              summaryText,
            );
            console.log(`[CashRegisterService] ✓ WhatsApp PDF sent to ${recipient.phone}`);
          } catch (e) {
            console.error(`[CashRegisterService] Failed to send WhatsApp PDF to ${recipient.phone}`, e);
          }
        }
        if (recipient.sendEmail && recipient.email) {
          try {
            await this.emailService.sendEmailDirect({
              to: recipient.email,
              subject: `Reporte de Cierre de Caja - ${filename}`,
              text: summaryText.replace(/\*/g, '').replace(/_/g, ''),
              html: summaryHtml,
              attachments: [{
                filename,
                content: pdfBuffer,
                contentType: 'application/pdf',
              }],
            });
            console.log(`[CashRegisterService] ✓ Email PDF sent to ${recipient.email}`);
          } catch (e) {
            console.error(`[CashRegisterService] Failed to send Email PDF to ${recipient.email}`, e);
          }
        }
      }
    } catch (error) {
      console.error('[CashRegisterService] Error sending PDF report:', error);
    }
  }

  async getRegisterById(id: string): Promise<CashRegister | null> {
    return this.cashRegisterRepository.findOne({ where: { id } });
  }

  async getTodayRegister(userId: string): Promise<CashRegister | null> {
    try {
      console.log('[🟢 getTodayRegister] Called for user:', userId);

      let register = await this.cashRegisterRepository.findOne({
        where: {
          userId,
          isOpen: true,
        },
        order: { createdAt: 'DESC' },
      });

      if (!register) {
        register = await this.cashRegisterRepository.findOne({
          where: {
            isOpen: true,
          },
          order: { createdAt: 'DESC' },
        });
        if (register) {
          console.log('[🟢 getTodayRegister] Found active OPEN register from another user:', register.id, 'opened by:', register.userId);
        }
      }

      console.log('[🟢 getTodayRegister] Query result:', register);
      
      if (register) {
        console.log('[🟢 getTodayRegister] ✓ Found OPEN register:', {
          id: register.id,
          userId: register.userId,
          isOpen: register.isOpen,
          openingAmount: register.openingAmount,
          createdAt: register.createdAt,
        });
      } else {
        console.log('[🟢 getTodayRegister] ✗ No OPEN register found');
      }

      return register;
    } catch (error) {
      console.error('[🟢 getTodayRegister] ❌ Error:', error);
      throw error;
    }
  }

  async getRegisterHistory(
    userId: string, 
    days: number = 30,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: CashRegister[]; total: number; page: number; lastPage: number }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const [data, total] = await this.cashRegisterRepository.findAndCount({
      where: {
        userId,
        registerDate: Between(startDate, new Date()),
      },
      order: { registerDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getRegisterDetail(registerId: string, userId: string): Promise<any> {
    const register = await this.cashRegisterRepository.findOne({
      where: { id: registerId },
    });

    if (!register) {
      throw new BadRequestException('Cierre de caja no encontrado');
    }

    // Verificar permisos: admin o el mismo usuario
    if (register.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para ver este cierre');
    }

    // Obtener ventas de este cierre
    const sales = await this.saleRepository.find({
      where: {
        cashRegisterId: registerId,
      },
      order: { createdAt: 'DESC' },
    });

    return {
      ...register,
      sales,
      salesCount: sales.length,
      totalSalesAmount: sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0),
    };
  }

  async getStatistics(
    startDate: string,
    endDate: string,
    userIdFilter?: string,
    requestUserId?: string,
  ): Promise<any> {
    const start = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T23:59:59Z');

    console.log('[Statistics] Parameters:', { startDate, endDate });
    console.log('[Statistics] Date range:', { 
      start: start.toISOString(), 
      end: end.toISOString() 
    });

    const query = this.cashRegisterRepository
      .createQueryBuilder('cr')
      .where('cr.registerDate >= :start', { start })
      .andWhere('cr.registerDate <= :end', { end })
      .andWhere('cr.closingAmount IS NOT NULL');

    if (userIdFilter) {
      query.andWhere('cr.userId = :userId', { userId: userIdFilter });
    }

    // Log de la query SQL generada
    console.log('[Statistics] SQL Query:', query.getSql());

    const registers = await query
      .orderBy('cr.registerDate', 'DESC')
      .getMany();

    console.log('[Statistics] Found registers with closing amount:', registers.length);
    if (registers.length > 0) {
      console.log('[Statistics] First register:', {
        id: registers[0].id,
        registerDate: registers[0].registerDate,
        isOpen: registers[0].isOpen,
        openingAmount: registers[0].openingAmount,
        closingAmount: registers[0].closingAmount,
        difference: registers[0].difference,
      });
    } else {
      console.log('[Statistics] No registers found. Checking all data...');
      const allRegisters = await this.cashRegisterRepository.find({
        where: {
          registerDate: Between(start, end),
        },
      });
      console.log('[Statistics] Total registers in date range (all):', allRegisters.length);
      if (allRegisters.length > 0) {
        console.log('[Statistics] Sample register from all:', {
          registerDate: allRegisters[0].registerDate,
          closingAmount: allRegisters[0].closingAmount,
          isOpen: allRegisters[0].isOpen,
        });
      }
    }

    const totalCashes = registers.length;
    
    // Convertir valores a números (pueden venir como strings de MySQL)
    const totalOpening = registers.reduce((sum, r) => {
      const amount = typeof r.openingAmount === 'string' ? parseFloat(r.openingAmount) : (r.openingAmount || 0);
      return sum + amount;
    }, 0);
    
    const totalClosing = registers.reduce((sum, r) => {
      const amount = typeof r.closingAmount === 'string' ? parseFloat(r.closingAmount) : (r.closingAmount || 0);
      return sum + amount;
    }, 0);
    
    const totalDifference = registers.reduce((sum, r) => {
      const amount = typeof r.difference === 'string' ? parseFloat(r.difference) : (r.difference || 0);
      return sum + amount;
    }, 0);
    
    const totalSales = registers.reduce((sum, r) => {
      const closing = typeof r.closingAmount === 'string' ? parseFloat(r.closingAmount) : (r.closingAmount || 0);
      const opening = typeof r.openingAmount === 'string' ? parseFloat(r.openingAmount) : (r.openingAmount || 0);
      return sum + (closing - opening);
    }, 0);

    // Encontrar discrepancias (cualquier diferencia != 0)
    const discrepancies = registers.filter(r => {
      const diff = typeof r.difference === 'string' ? parseFloat(r.difference) : (r.difference || 0);
      return diff !== 0;
    });

    return {
      period: { startDate, endDate },
      totalCashes,
      totalOpening: Number(totalOpening.toFixed(2)),
      totalClosing: Number(totalClosing.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      totalDifference: Number(totalDifference.toFixed(2)),
      averageDifference: totalCashes > 0 ? Number((totalDifference / totalCashes).toFixed(2)) : 0,
      discrepancyCount: discrepancies.length,
      discrepancies: discrepancies.map(r => ({
        id: r.id,
        registerDate: r.registerDate,
        difference: typeof r.difference === 'string' ? parseFloat(r.difference) : r.difference,
        expectedClosure: r.expectedClosure,
        closingAmount: r.closingAmount,
      })),
    };
  }

  async getDiscrepancies(
    severity?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<any> {
    console.log('[Discrepancies] Params:', { severity, startDate, endDate, page, limit });
    
    const query = this.cashRegisterRepository
      .createQueryBuilder('cr')
      .where('cr.difference IS NOT NULL')
      .andWhere('ABS(cr.difference) > 0')
      .andWhere('cr.closingAmount IS NOT NULL')
      .orderBy('ABS(cr.difference)', 'DESC');

    // Filtrar por rango de fechas si se proporciona
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00Z');
      const end = new Date(endDate + 'T23:59:59Z');
      
      console.log('[Discrepancies] Date filter:', {
        startDate,
        endDate,
        parsedStart: start.toISOString(),
        parsedEnd: end.toISOString(),
      });
      
      // Usar comparación con >= y <=
      query.andWhere('cr.registerDate >= :start', { start })
           .andWhere('cr.registerDate <= :end', { end });
    }

    console.log('[Discrepancies] Severity filter:', severity);
    if (severity === 'HIGH' || severity === 'high') {
      console.log('[Discrepancies] Applying HIGH filter: ABS(difference) > 100');
      query.andWhere('ABS(cr.difference) > 100');
    } else if (severity === 'MEDIUM' || severity === 'medium') {
      console.log('[Discrepancies] Applying MEDIUM filter: ABS(difference) BETWEEN 10 AND 100');
      query.andWhere('ABS(cr.difference) BETWEEN 10 AND 100');
    } else if (severity === 'LOW' || severity === 'low') {
      console.log('[Discrepancies] Applying LOW filter: ABS(difference) < 10');
      query.andWhere('ABS(cr.difference) < 10');
    }

    console.log('[Discrepancies] SQL Query:', query.getSql());

    const [data, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    console.log('[Discrepancies] Found:', total, 'records');
    console.log('[Discrepancies] Data:', data.map(r => ({ id: r.id, difference: r.difference })));

    return {
      data: data.map(r => ({
        id: r.id,
        registerDate: r.registerDate,
        userId: r.userId,
        difference: r.difference,
        expectedClosure: r.expectedClosure,
        closingAmount: r.closingAmount,
        severity: Math.abs(r.difference || 0) > 100 ? 'HIGH' : Math.abs(r.difference || 0) >= 10 ? 'MEDIUM' : 'LOW',
      })),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  exportToCSV(registers: CashRegister[]): string {
    const headers = ['ID', 'Fecha', 'Apertura', 'Cierre', 'Diferencia', 'Estado'];
    const rows = registers.map(r => [
      r.id,
      r.registerDate.toString(),
      r.openingAmount.toString(),
      r.closingAmount.toString(),
      r.difference.toString(),
      r.isOpen ? 'ABIERTA' : 'CERRADA',
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    return csv;
  }

  exportToHTML(registers: CashRegister[], title: string = 'Reporte de Cajas'): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { text-align: center; color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #007bff; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Apertura</th>
          <th>Cierre</th>
          <th>Diferencia</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${registers.map(r => `
          <tr>
            <td>${r.registerDate.toString()}</td>
            <td>RD$ ${r.openingAmount.toFixed(2)}</td>
            <td>RD$ ${r.closingAmount.toFixed(2)}</td>
            <td>RD$ ${Math.abs(r.difference).toFixed(2)}</td>
            <td>${r.isOpen ? 'ABIERTA' : 'CERRADA'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;
  }

  exportToJSON(registers: CashRegister[]): string {
    return JSON.stringify({ registers }, null, 2);
  }

  async getShiftPayments(cashRegisterId: string): Promise<any[]> {
    const cashRegister = await this.cashRegisterRepository.findOne({
      where: { id: cashRegisterId },
    });

    if (!cashRegister) {
      return [];
    }

    const dateStr = typeof cashRegister.registerDate === 'string'
      ? cashRegister.registerDate
      : (cashRegister.registerDate as Date).toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-').map(Number);
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = cashRegister.closedAt
      ? new Date(cashRegister.closedAt)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

    const payments = await this.paymentRepository
      .createQueryBuilder('p')
      .where(
        cashRegister.isOpen
          ? '(p.cashRegisterId = :regId OR (p.cashRegisterId IS NULL AND p.createdAt >= :start AND p.createdAt <= :end))'
          : 'p.cashRegisterId = :regId',
        { regId: cashRegisterId, start: startOfDay, end: endOfDay },
      )
      .andWhere("p.status = 'completed'")
      .orderBy('p.createdAt', 'DESC')
      .getMany();

    const enriched = await Promise.all(
      payments.map(async (payment) => {
        let memberName = 'Socio';
        let memberCode = '';
        let planName = payment.description || 'Membresía';

        const mm = await this.cashRegisterRepository.query(
          `SELECT mm.id, m.memberCode, u.firstName, u.lastName, mem.name as planName
           FROM member_memberships mm
           LEFT JOIN members m ON mm.memberId = m.id
           LEFT JOIN users u ON m.userId = u.id
           LEFT JOIN memberships mem ON mm.membershipId = mem.id
           WHERE mm.paymentId = ? LIMIT 1`,
          [payment.id],
        );

        if (mm && mm.length > 0) {
          const row = mm[0];
          memberName = `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Socio';
          memberCode = row.memberCode || '';
          if (row.planName) planName = row.planName;
        }

        return {
          id: payment.id,
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          paymentType: payment.paymentType,
          status: payment.status,
          concept: planName,
          memberName,
          memberCode,
          paymentDate: payment.paymentDate || payment.createdAt,
          createdAt: payment.createdAt,
        };
      }),
    );

    return enriched;
  }
}
