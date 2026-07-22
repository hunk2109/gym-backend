import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountingService } from './accounting.service';
import { AccountingController } from './accounting.controller';
import { AccountPayable } from '../../entities/account-payable.entity';
import { AccountReceivable } from '../../entities/account-receivable.entity';
import { CashRegisterTransaction } from '../../entities/cash-register-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountPayable,
      AccountReceivable,
      CashRegisterTransaction,
    ]),
  ],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
