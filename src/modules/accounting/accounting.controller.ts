import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('payables')
  getPayables() {
    return this.accountingService.getPayables();
  }

  @Post('payables')
  createPayable(@Body() dto: any) {
    return this.accountingService.createPayable(dto);
  }

  @Get('receivables')
  getReceivables() {
    return this.accountingService.getReceivables();
  }

  @Post('receivables')
  createReceivable(@Body() dto: any) {
    return this.accountingService.createReceivable(dto);
  }

  @Get('cash-transactions/:cashRegisterId')
  getCashTransactions(@Param('cashRegisterId') cashRegisterId: string) {
    return this.accountingService.getCashRegisterTransactions(cashRegisterId);
  }
}
