import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountPayable } from '../../entities/account-payable.entity';
import { AccountReceivable } from '../../entities/account-receivable.entity';
import { CashRegisterTransaction, CashRegisterTransactionType } from '../../entities/cash-register-transaction.entity';

@Injectable()
export class AccountingService {
  constructor(
    @InjectRepository(AccountPayable)
    private payableRepo: Repository<AccountPayable>,
    @InjectRepository(AccountReceivable)
    private receivableRepo: Repository<AccountReceivable>,
    @InjectRepository(CashRegisterTransaction)
    private cashTxRepo: Repository<CashRegisterTransaction>,
  ) {}

  // Account Payable
  async getPayables() {
    return this.payableRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createPayable(dto: Partial<AccountPayable>) {
    const payable: AccountPayable = this.payableRepo.create(dto);
    const saved: AccountPayable = await this.payableRepo.save(payable);

    if (saved.isCashWithdrawal && saved.cashRegisterId) {
      // Create a CashRegisterTransaction
      const cashTx = this.cashTxRepo.create({
        cashRegisterId: saved.cashRegisterId,
        type: CashRegisterTransactionType.OUT,
        amount: saved.amount,
        concept: saved.concept,
        referenceId: saved.id,
      });
      await this.cashTxRepo.save(cashTx);
    }
    return saved;
  }

  // Account Receivable
  async getReceivables() {
    return this.receivableRepo.find({ relations: ['member'], order: { createdAt: 'DESC' } });
  }

  async createReceivable(dto: any) {
    const receivable = this.receivableRepo.create(dto);
    return this.receivableRepo.save(receivable);
  }

  // Cash Register Transactions
  async getCashRegisterTransactions(cashRegisterId: string) {
    return this.cashTxRepo.find({
      where: { cashRegisterId },
      order: { createdAt: 'ASC' },
    });
  }
}
