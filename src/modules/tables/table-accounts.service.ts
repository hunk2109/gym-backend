import { Injectable, NotFoundException, BadRequestException, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableAccount, AccountStatus } from '../../entities/table-account.entity';
import { TableAccountItem } from '../../entities/table-account-item.entity';
import { Table, TableStatus } from '../../entities/table.entity';
import { Product } from '../../entities/product.entity';
import { AddItemToAccountDto, UpdateAccountDto } from './dto/table-account.dto';
import { TablesService } from './tables.service';
import { SalesService } from '../sales/sales.service';

@Injectable()
export class TableAccountsService {
  private readonly logger = new Logger(TableAccountsService.name);

  constructor(
    @InjectRepository(TableAccount)
    private accountRepository: Repository<TableAccount>,
    @InjectRepository(TableAccountItem)
    private itemRepository: Repository<TableAccountItem>,
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private tablesService: TablesService,
    @Inject(forwardRef(() => SalesService))
    private salesService: SalesService,
  ) {}

  async openAccount(tableId: string, userId: string) {
    // Verificar que la mesa existe
    const table = await this.tableRepository.findOne({ where: { id: tableId } });
    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Verificar que no haya cuenta abierta
    const existing = await this.accountRepository.findOne({
      where: { tableId, status: AccountStatus.OPEN },
    });

    if (existing) {
      throw new BadRequestException('This table already has an open account');
    }

    const account = this.accountRepository.create({
      tableId,
      userId,
      status: AccountStatus.OPEN,
    });

    const saved = await this.accountRepository.save(account);

    // Cambiar estado de mesa a OPEN
    await this.tablesService.updateTableStatus(tableId, TableStatus.OPEN);

    this.logger.log(`Account opened: Table ${table.tableNumber}, Account ${saved.id}`);
    return this.getAccountById(saved.id);
  }

  async getAccountById(id: string) {
    const account = await this.accountRepository.findOne({
      where: { id },
      relations: ['table', 'items', 'items.product'],
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Filtrar items no removidos antes de devolver
    if (account.items) {
      account.items = account.items.filter(item => !item.removedAt);
    }

    return this.calculateTotals(account);
  }

  async getOpenAccountByTableId(tableId: string) {
    const account = await this.accountRepository.findOne({
      where: { tableId, status: AccountStatus.OPEN },
      relations: ['table', 'items', 'items.product'],
    });

    if (!account) {
      throw new NotFoundException('No open account for this table');
    }

    return this.calculateTotals(account);
  }

  async addItemToAccount(accountId: string, addItemDto: AddItemToAccountDto) {
    const account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.OPEN) {
      throw new BadRequestException('Cannot add items to a closed account');
    }

    // Verificar que el producto existe
    const product = await this.productRepository.findOne({
      where: { id: addItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Crear item
    const subtotal = addItemDto.quantity * Number(addItemDto.unitPrice);
    const item = this.itemRepository.create({
      accountId,
      productId: addItemDto.productId,
      quantity: addItemDto.quantity,
      unitPrice: addItemDto.unitPrice,
      subtotal,
    });

    const savedItem = await this.itemRepository.save(item);

    // Actualizar total de la cuenta
    const newTotal = Number(account.totalAmount) + subtotal;
    await this.accountRepository.update(accountId, {
      totalAmount: newTotal,
    });

    this.logger.log(
      `Item added to account: Product ${product.name} x${addItemDto.quantity}, Subtotal: $${subtotal}`,
    );

    return this.getAccountById(accountId);
  }

  async removeItemFromAccount(itemId: string) {
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['account'],
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const account = await this.getAccountById(item.accountId);

    if (account.status !== AccountStatus.OPEN) {
      throw new BadRequestException('Cannot remove items from a closed account');
    }

    // Restar del total
    const newTotal = Number(account.totalAmount) - Number(item.subtotal);
    await this.accountRepository.update(item.accountId, {
      totalAmount: Math.max(newTotal, 0),
    });

    // Marcar como removido
    item.removedAt = new Date();
    await this.itemRepository.save(item);

    this.logger.log(`Item removed from account: ${item.id}`);

    return this.getAccountById(item.accountId);
  }

  async getCurrentTotal(accountId: string) {
    const account = await this.getAccountById(accountId);
    return {
      subtotal: account.totalAmount,
      discount: account.discount,
      total: account.finalAmount,
    };
  }

  async updateAccount(accountId: string, updateDto: UpdateAccountDto) {
    const account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.OPEN) {
      throw new BadRequestException('Cannot update a closed account');
    }

    Object.assign(account, updateDto);
    await this.accountRepository.save(account);

    this.logger.log(`Account updated: ${accountId}`);
    return this.getAccountById(accountId);
  }

  async closeAccount(accountId: string) {
    const account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.OPEN) {
      throw new BadRequestException('Account is not open');
    }

    await this.accountRepository.update(accountId, {
      status: AccountStatus.CLOSED,
      closedAt: new Date(),
    });

    // Cambiar estado de mesa a AVAILABLE (la cuenta se cerró, mesa disponible nuevamente)
    await this.tablesService.updateTableStatus(account.tableId, TableStatus.AVAILABLE);

    this.logger.log(`Account closed: ${accountId}, Total: $${account.finalAmount}`);

    return this.getAccountById(accountId);
  }

  async completePayment(accountId: string, paymentMethod: string = 'cash', userId: string) {
    const account = await this.getAccountById(accountId);

    if (account.status !== AccountStatus.CLOSED) {
      throw new BadRequestException('Account must be closed before payment');
    }

    // Obtener items activos (no removidos)
    const activeItems = account.items?.filter(item => !item.removedAt) || [];
    
    if (activeItems.length === 0) {
      throw new BadRequestException('Cannot complete payment with no items');
    }

    // Crear la venta en el sistema de ventas
    const saleDto = {
      memberId: undefined, // Las ventas de mesa pueden no tener socio
      items: activeItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      discount: account.discount || 0,
      paymentMethod: paymentMethod,
      notes: `Venta de Mesa ${account.table?.tableNumber || 'N/A'}`,
    };

    this.logger.log(`Creating sale for table account ${accountId}`);
    const sale = await this.salesService.createSale(saleDto, userId);

    // Actualizar la cuenta con el ID de la venta
    await this.accountRepository.update(accountId, {
      status: AccountStatus.PAID,
      saleId: sale.id,
    });

    // Liberar mesa - vuelve a AVAILABLE
    await this.tablesService.updateTableStatus(account.tableId, TableStatus.AVAILABLE);

    this.logger.log(`Payment completed: Account ${accountId}, Sale ${sale.id}, Total: $${account.finalAmount}`);

    return this.getAccountById(accountId);
  }

  async cancelAccount(accountId: string) {
    const account = await this.getAccountById(accountId);

    if (account.status === AccountStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid account');
    }

    await this.accountRepository.update(accountId, {
      status: AccountStatus.CANCELLED,
      closedAt: new Date(),
    });

    // Liberar mesa
    await this.tablesService.updateTableStatus(account.tableId, TableStatus.AVAILABLE);

    this.logger.warn(`Account cancelled: ${accountId}`);

    return this.getAccountById(accountId);
  }

  async getAllOpenAccounts() {
    return this.accountRepository.find({
      where: { status: AccountStatus.OPEN },
      relations: ['table', 'user', 'items', 'items.product'],
      order: { openedAt: 'DESC' },
    });
  }

  private calculateTotals(account: any) {
    // Recalcular total de items activos
    const activeItems = account.items?.filter((i) => !i.removedAt) || [];
    const calculatedTotal = activeItems.reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    );
    
    const discount = Number(account.discount) || 0;
    const finalAmount = calculatedTotal - discount;

    this.logger.debug(`[calculateTotals] Account: ${account.id}`);
    this.logger.debug(`[calculateTotals] Active items: ${activeItems.length}`);
    this.logger.debug(`[calculateTotals] Calculated total: ${calculatedTotal}`);
    this.logger.debug(`[calculateTotals] Discount: ${discount}`);
    this.logger.debug(`[calculateTotals] Final amount: ${finalAmount}`);

    return {
      ...account,
      totalAmount: calculatedTotal,
      itemsCount: activeItems.length,
      discount: discount,
      finalAmount: finalAmount > 0 ? finalAmount : 0,
    };
  }
}
