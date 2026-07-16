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
      
      // Obtener total de ventas del día para esta caja (incluyendo las ya asignadas)
      const salesQuery = await this.saleRepository.query(
        `SELECT COALESCE(SUM(totalAmount - discount), 0) as total FROM sales 
         WHERE createdAt >= ? AND createdAt <= ? AND status = 'completed' AND (cashRegisterId = ? OR cashRegisterId IS NULL)`,
        [startOfDay, endOfDay, cashRegister.id]
      );
      
      const totalSales = Number(salesQuery[0]?.total || 0);
      console.log('[CashRegisterService] Total sales for the day:', totalSales);

      // Obtener total de pagos (inscripciones, membresias) del día
      const paymentsQuery = await this.paymentRepository.query(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payments
         WHERE createdAt >= ? AND createdAt <= ? AND status = 'completed' AND (createdBy = ? OR createdBy IS NULL)`,
        [startOfDay, endOfDay, userId]
      );
      
      const totalPayments = Number(paymentsQuery[0]?.total || 0);
      console.log('[CashRegisterService] Total payments for the day:', totalPayments);

      // Calcular lo que debería haber: Apertura + Ventas + Pagos
      const expectedClosure = Number(cashRegister.openingAmount) + totalSales + totalPayments;
      console.log('[CashRegisterService] Opening amount:', cashRegister.openingAmount, '+ Sales:', totalSales, '+ Payments:', totalPayments, '= Expected:', expectedClosure);

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
      console.log('[CashRegisterService] Linking sales to this cash register...');
      console.log('[CashRegisterService] Register ID:', saved.id);
      console.log('[CashRegisterService] Date range:', startOfDay.toISOString(), 'to', endOfDay.toISOString());
      
      // Usar query SQL directa para actualizar
      const result = await this.saleRepository.query(
        `UPDATE sales SET cashRegisterId = ? WHERE createdAt >= ? AND createdAt <= ? AND cashRegisterId IS NULL`,
        [saved.id, startOfDay, endOfDay]
      );
      
      console.log('[CashRegisterService] Updated sales result:', result);

      // Registrar en auditoría
      await this.auditLogService.create({
        action: 'CASH_REGISTER_CLOSE',
        module: 'CASH_REGISTER',
        description: `Caja cerrada: Esperado RD$ ${expectedClosure}, Cierre RD$ ${dto.closingAmount}, Diferencia RD$ ${difference}`,
        userId,
        newValue: { closingAmount: dto.closingAmount, difference },
      });

      console.log('[CashRegisterService] ✓ Cash register closed successfully');
      return saved;
    } catch (error) {
      console.error('[CashRegisterService] ❌ Error in closeCashRegister:', error);
      throw error;
    }
  }

  async sendPdfReport(base64Pdf: string): Promise<void> {
    try {
      const settings = await this.gymSettingsService.getSettings();
      if (!settings || !settings.closingReportRecipients || !Array.isArray(settings.closingReportRecipients)) {
        console.log('[CashRegisterService] No closing report recipients configured, skipping.');
        return;
      }

      const filename = `Cierre_Caja_${new Date().toISOString().slice(0, 10)}.pdf`;
      const summaryText = `*Reporte de Cierre de Caja*\nSe adjunta el recibo del cierre de caja.\n_Generado por Gym Manager_`;
      const summaryHtml = `<h2>Reporte de Cierre de Caja</h2><p>Se adjunta el recibo del cierre de caja generado por Gym Manager.</p>`;

      const pdfBuffer = Buffer.from(base64Pdf, 'base64');

      for (const recipient of settings.closingReportRecipients) {
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

  async getTodayRegister(userId: string): Promise<CashRegister | null> {
    try {
      console.log('[🟢 getTodayRegister] Called for user:', userId);

      const register = await this.cashRegisterRepository.findOne({
        where: {
          userId,
          isOpen: true,
        },
        order: { createdAt: 'DESC' },
      });

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
}
