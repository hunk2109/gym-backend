import { Controller, Post, Get, Body, UseGuards, Request, Query, Param, ParseIntPipe } from '@nestjs/common';
import { CashRegisterService } from './cash-register.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpenCashRegisterDto, CloseCashRegisterDto } from './dto/cash-register.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('cash-register')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CashRegisterController {
  constructor(private cashRegisterService: CashRegisterService) {}

  @Post('open')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async openCashRegister(
    @Request() req,
    @Body() dto: OpenCashRegisterDto,
  ) {
    try {
      const userId = req.user.userId;
      console.log('[CashRegisterController] Opening cash register for user:', userId);
      console.log('[CashRegisterController] DTO:', JSON.stringify(dto));
      
      const register = await this.cashRegisterService.openCashRegister(userId, dto);
      
      console.log('[CashRegisterController] ✓ Cash register opened successfully');
      return register;
    } catch (error) {
      console.error('[CashRegisterController] ❌ Error opening cash:', error);
      console.error('[CashRegisterController] Error message:', error.message);
      throw error;
    }
  }

  @Post('close')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async closeCashRegister(
    @Request() req,
    @Body() dto: CloseCashRegisterDto,
  ) {
    try {
      const userId = req.user.userId;
      console.log('[CashRegister] Closing cash register for user:', userId);
      console.log('[CashRegister] Raw DTO:', JSON.stringify(dto, null, 2));
      console.log('[CashRegister] closingAmount:', dto.closingAmount, '(tipo:', typeof dto.closingAmount, ')');
      const register = await this.cashRegisterService.closeCashRegister(userId, dto);
      return register;
    } catch (error) {
      console.error('[CashRegister] Error closing cash:', error);
      throw error;
    }
  }

  @Post('send-report')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async sendClosingReport(
    @Body() body: { base64Pdf: string },
  ) {
    try {
      console.log('[CashRegister] Sending PDF report to recipients...');
      await this.cashRegisterService.sendPdfReport(body.base64Pdf);
      return { success: true, message: 'PDF report sent to recipients' };
    } catch (error) {
      console.error('[CashRegister] Error sending report:', error);
      throw error;
    }
  }

  @Get('today')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async getTodayRegister(@Request() req) {
    try {
      const userId = req.user.userId;
      console.log('[🟢 GET TODAY] User:', userId);
      const register = await this.cashRegisterService.getTodayRegister(userId);
      
      console.log('[🟢 GET TODAY] Result:', register);
      
      return register || { message: 'No hay caja abierta para hoy' };
    } catch (error) {
      console.error('[🟢 GET TODAY] Error getting today register:', error);
      throw error;
    }
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async getHistory(
    @Request() req,
    @Query('days', ParseIntPipe) days: number = 30,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 10,
  ) {
    try {
      const userId = req.user.userId;
      console.log('[CashRegister] Getting cash register history for user:', userId);
      const history = await this.cashRegisterService.getRegisterHistory(userId, days, page, limit);
      return history;
    } catch (error) {
      console.error('[CashRegister] Error getting history:', error);
      throw error;
    }
  }

  @Get('history/:id')
  @Roles(UserRole.ADMIN, UserRole.EMPLEADO_CAJERO, UserRole.ENCARGADO)
  async getRegisterDetail(@Request() req, @Param('id') registerId: string) {
    try {
      const userId = req.user.userId;
      const detail = await this.cashRegisterService.getRegisterDetail(registerId, userId);
      return detail;
    } catch (error) {
      console.error('[CashRegister] Error getting register detail:', error);
      throw error;
    }
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userIdFilter?: string,
  ) {
    try {
      const requestUserId = req.user.userId;
      const stats = await this.cashRegisterService.getStatistics(
        startDate,
        endDate,
        userIdFilter,
        requestUserId,
      );
      return stats;
    } catch (error) {
      console.error('[CashRegister] Error getting statistics:', error);
      throw error;
    }
  }

  @Get('discrepancies')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getDiscrepancies(
    @Request() req,
    @Query('severity') severity?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ) {
    try {
      const discrepancies = await this.cashRegisterService.getDiscrepancies(
        severity,
        startDate,
        endDate,
        page,
        limit,
      );
      return discrepancies;
    } catch (error) {
      console.error('[CashRegister] Error getting discrepancies:', error);
      throw error;
    }
  }

  @Get('export/history/csv')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async exportHistoryCSV(
    @Request() req,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    try {
      const history = await this.cashRegisterService.getRegisterHistory(
        req.user.userId,
        days,
        1,
        1000,
      );
      const csv = this.cashRegisterService.exportToCSV(history.data || []);

      return {
        csv,
        filename: `historial-cajas-${new Date().getTime()}.csv`,
      };
    } catch (error) {
      console.error('[CashRegister] Error exporting CSV:', error);
      throw error;
    }
  }

  @Get('export/history/html')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async exportHistoryHTML(
    @Request() req,
    @Query('days', ParseIntPipe) days: number = 30,
  ) {
    try {
      const history = await this.cashRegisterService.getRegisterHistory(
        req.user.userId,
        days,
        1,
        1000,
      );
      const html = this.cashRegisterService.exportToHTML(
        history.data || [],
        `Historial de Cajas - Últimos ${days} días`,
      );

      return {
        html,
        filename: `historial-cajas-${new Date().getTime()}.html`,
      };
    } catch (error) {
      console.error('[CashRegister] Error exporting HTML:', error);
      throw error;
    }
  }

  @Get('export/statistics')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async exportStatisticsJSON(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const stats = await this.cashRegisterService.getStatistics(
        startDate,
        endDate,
        undefined,
        req.user.userId,
      );
      const json = this.cashRegisterService.exportToJSON(stats.registers || []);

      return {
        json,
        filename: `estadisticas-cajas-${new Date().getTime()}.json`,
      };
    } catch (error) {
      console.error('[CashRegister] Error exporting JSON:', error);
      throw error;
    }
  }
}
