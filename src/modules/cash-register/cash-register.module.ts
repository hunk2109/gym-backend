import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashRegister } from '../../entities/cash-register.entity';
import { Sale } from '../../entities/sale.entity';
import { Payment } from '../../entities/payment.entity';
import { AuditLog } from '../../entities/audit-log.entity';
import { CashRegisterService } from './cash-register.service';
import { CashRegisterController } from './cash-register.controller';
import { SeedCashRegisterController } from './seed-cash-register.controller';
import { CashRegisterValidationService } from './cash-register.validation.service';
import { CashRegisterExportService } from './cash-register.export.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([CashRegister, Sale, Payment, AuditLog])],
  providers: [CashRegisterService, CashRegisterValidationService, CashRegisterExportService, AuditLogService],
  controllers: [CashRegisterController, SeedCashRegisterController],
  exports: [CashRegisterService, CashRegisterValidationService, CashRegisterExportService],
})
export class CashRegisterModule {}
