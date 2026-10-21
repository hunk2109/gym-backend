import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Sale, SaleStatus } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { CreateSaleDto, UpdateSaleDto } from './dto/create-sale.dto';
import { ProductService } from '../products/product.service';
import { CashRegisterService } from '../cash-register/cash-register.service';
import { PermissionsService } from '../auth/services/permissions.service';
import { UserRole } from '../../entities/user.entity';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Sale)
    private saleRepository: Repository<Sale>,
    @InjectRepository(SaleItem)
    private saleItemRepository: Repository<SaleItem>,
    private productService: ProductService,
    private cashRegisterService: CashRegisterService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getAllSales(page = 1, limit = 50, cashRegisterId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (cashRegisterId) {
      where.cashRegisterId = cashRegisterId;
    }
    const [sales, total] = await this.saleRepository.findAndCount({
      where,
      relations: ['items', 'items.product', 'member'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      sales: sales.map(sale => this.transformSaleWithSubtotals(sale)),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getSaleById(id: string) {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['items', 'items.product', 'member'],
    });
    if (!sale) {
      throw new NotFoundException(`Sale ${id} not found`);
    }
    return this.transformSaleWithSubtotals(sale);
  }

  async createSale(createSaleDto: CreateSaleDto, userId: string) {
    this.logger.debug('[SalesService] Creating sale with DTO:', createSaleDto);
    console.log('[🔴 SalesService.createSale] Received DTO:', JSON.stringify(createSaleDto, null, 2));
    console.log('[🔴 SalesService.createSale] userId:', userId);
    
    // Validar que paymentMethod existe
    if (!createSaleDto.paymentMethod) {
      throw new BadRequestException('Payment method is required');
    }

    let totalAmount = 0;

    // Validate products and stock
    for (const item of createSaleDto.items) {
      console.log(`[🔴 SalesService.createSale] Processing item: productId=${item.productId}, quantity=${item.quantity}, unitPrice=${item.unitPrice}`);
      const product = await this.productService.getProductById(item.productId);
      if (product.quantityAvailable < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}`,
        );
      }
      const itemTotal = item.quantity * item.unitPrice;
      console.log(`[🔴 SalesService.createSale] Item total: ${item.quantity} * ${item.unitPrice} = ${itemTotal}`);
      totalAmount += itemTotal;
    }
    
    console.log(`[🔴 SalesService.createSale] ✓ Final totalAmount: ${totalAmount}`);

    // Validar que exista una caja abierta antes de permitir la venta
    const openCashRegister = await this.cashRegisterService.getTodayRegister(userId);
    if (!openCashRegister || !openCashRegister.isOpen) {
      throw new BadRequestException(
        'No se pueden realizar ventas porque no hay una caja abierta en el sistema. Por favor, abre un turno de caja primero en el módulo de Caja & Arqueo.',
      );
    }
    const cashRegisterId = openCashRegister.id;
    console.log('[🔴 SalesService.createSale] Open cash register confirmed:', cashRegisterId);

    // Resolver memberId válido para la tabla users (evitar fallo de clave foránea FK_d59c60263801450032c9f9e7a6f)
    let validUserId: string | null = null;
    if (createSaleDto.memberId) {
      try {
        const userRows = await this.saleRepository.manager.query(
          'SELECT id FROM users WHERE id = ? LIMIT 1',
          [createSaleDto.memberId]
        );
        if (userRows && userRows.length > 0) {
          validUserId = createSaleDto.memberId;
        } else {
          const memberRows = await this.saleRepository.manager.query(
            'SELECT userId FROM members WHERE id = ? LIMIT 1',
            [createSaleDto.memberId]
          );
          if (memberRows && memberRows.length > 0 && memberRows[0].userId) {
            const checkUser = await this.saleRepository.manager.query(
              'SELECT id FROM users WHERE id = ? LIMIT 1',
              [memberRows[0].userId]
            );
            if (checkUser && checkUser.length > 0) {
              validUserId = memberRows[0].userId;
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Error resolving memberId to userId: ${err.message}`);
      }
    }

    // Si el método de pago es saldo a favor, validar y descontar del socio
    if (createSaleDto.paymentMethod === 'credit_balance') {
      if (!createSaleDto.memberId) {
        throw new BadRequestException('Para pagar con saldo a favor es necesario seleccionar un socio registrado.');
      }
      const memberRows = await this.saleRepository.manager.query(
        'SELECT id, creditBalance FROM members WHERE id = ? OR userId = ? LIMIT 1',
        [createSaleDto.memberId, createSaleDto.memberId]
      );
      if (!memberRows || memberRows.length === 0) {
        throw new BadRequestException('No se encontró el socio para verificar el saldo a favor.');
      }
      const member = memberRows[0];
      const memberCredit = Number(member.creditBalance || 0);
      const netToPay = Math.max(0, totalAmount - (createSaleDto.discount || 0));
      if (memberCredit < netToPay) {
        throw new BadRequestException(
          `Saldo a favor insuficiente. Disponible: RD$ ${memberCredit.toFixed(2)}, Total compra: RD$ ${netToPay.toFixed(2)}`,
        );
      }
      await this.saleRepository.manager.query(
        'UPDATE members SET creditBalance = creditBalance - ? WHERE id = ?',
        [netToPay, member.id]
      );
      this.logger.log(`[Sales] 💰 Saldo a favor descontado: RD$ ${netToPay} al socio ${member.id}`);
    }

    // Create sale
    const sale = this.saleRepository.create({
      memberId: validUserId,
      customerName: createSaleDto.customerName || null,
      totalAmount,
      discount: createSaleDto.discount || 0,
      paymentMethod: createSaleDto.paymentMethod,
      notes: createSaleDto.notes,
      status: 'completed' as any,
      userId: userId,
      cashRegisterId: cashRegisterId,
    });

    const savedSale = await this.saleRepository.save(sale);

    // Create sale items and update stock
    for (const item of createSaleDto.items) {
      const saleItem = this.saleItemRepository.create({
        saleId: (savedSale as any).id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      });
      await this.saleItemRepository.save(saleItem);
      console.log(`[🔴 SalesService.createSale] Saved sale item for productId=${item.productId}, quantity=${item.quantity}`);

      // Update stock
      console.log(`[🔴 SalesService.createSale] Before removeStock - productId=${item.productId}, quantity=${item.quantity}`);
      const updatedProduct = await this.productService.removeStock(
        item.productId,
        item.quantity,
      );
      console.log(`[🔴 SalesService.createSale] After removeStock - New quantity=${updatedProduct.quantityAvailable} for product ${item.productId}`);
    }

    this.logger.log(`[Sales] Sale created successfully. ID: ${(savedSale as any).id}, Amount: ${totalAmount}`);
    return this.getSaleById((savedSale as any).id);
  }

  async updateSale(id: string, updateSaleDto: UpdateSaleDto) {
    await this.saleRepository.update(id, updateSaleDto as any);
    return this.getSaleById(id);
  }

  async deleteSale(id: string, reason?: string, user?: any) {
    const sale = await this.getSaleById(id);

    // Solo anular si no está ya anulada
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Esta venta ya ha sido anulada');
    }

    // Si la venta está asociada a un turno de caja, verificar que esté abierto
    if (sale.cashRegisterId) {
      const register = await this.cashRegisterService.getRegisterById(sale.cashRegisterId);
      if (register && !register.isOpen) {
        throw new BadRequestException('No se puede anular una venta de un turno de caja que ya ha sido cerrado');
      }
    }

    // Restore stock
    for (const item of sale.items) {
      await this.productService.addStock(
        item.productId,
        item.quantity,
      );
    }

    // Si la venta se pagó con saldo a favor, reincorporarlo al socio
    if (sale.paymentMethod === 'credit_balance' && sale.memberId) {
      const netToRefund = Math.max(0, Number(sale.totalAmount) - Number(sale.discount || 0));
      await this.saleRepository.manager.query(
        'UPDATE members SET creditBalance = creditBalance + ? WHERE id = ? OR userId = ?',
        [netToRefund, sale.memberId, sale.memberId]
      );
      this.logger.log(`[Sales] 💰 Saldo a favor reembolsado: RD$ ${netToRefund} al anular venta ${sale.id}`);
    }

    // Registrar motivo y usuario en las notas
    const cancelInfo = `[ANULADA por ${user?.name || user?.email || 'Usuario'}${reason ? ': ' + reason : ''}]`;
    const updatedNotes = sale.notes ? `${sale.notes} | ${cancelInfo}` : cancelInfo;

    // Cambiar estado a 'cancelled' en lugar de eliminar
    await this.saleRepository.update(id, { 
      status: SaleStatus.CANCELLED,
      notes: updatedNotes,
    });
    this.logger.warn(`[SENSITIVE] Sale cancelled: ${id}, Amount: ${sale.totalAmount}, By: ${user?.userId || 'N/A'}, Reason: ${reason || 'N/A'}`);

    return {
      success: true,
      message: 'Venta anulada correctamente y productos devueltos al inventario',
    };
  }

  async getSalesByMember(memberId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [sales, total] = await this.saleRepository.findAndCount({
      where: { memberId },
      relations: ['items', 'items.product'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return {
      sales: sales.map(sale => this.transformSaleWithSubtotals(sale)),
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getSalesStatistics(startDate?: string, endDate?: string) {
    const query = this.saleRepository.createQueryBuilder('sale');

    if (startDate && endDate) {
      query.where('sale.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const sales = await query.getMany();
    const totalRevenue = sales.reduce((sum, sale) => {
      return sum + Number(sale.totalAmount) - Number(sale.discount);
    }, 0);

    return {
      totalSales: sales.length,
      totalRevenue,
      averageSale: sales.length > 0 ? totalRevenue / sales.length : 0,
    };
  }

  async getSalesByDateRange(startDate: string, endDate: string, cashRegisterId?: string) {
    this.logger.debug(`[getSalesByDateRange] Received: startDate=${startDate}, endDate=${endDate}, cashRegisterId=${cashRegisterId}`);
    
    // Asegurar que las fechas incluyan "Z" para UTC si no lo tienen
    const startStr = startDate.includes('Z') ? startDate : `${startDate}Z`;
    const endStr = endDate.includes('Z') ? endDate : `${endDate}Z`;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    this.logger.debug(`[getSalesByDateRange] Parsed dates: start=${start.toISOString()}, end=${end.toISOString()}`);
    
    // DEBUG: Obtener TODAS las ventas en el rango para ver estados
    const allSales = await this.saleRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      relations: ['items', 'items.product', 'member'],
      order: { createdAt: 'DESC' },
    });
    
    this.logger.debug(`[getSalesByDateRange] DEBUG: Total sales in range (all statuses): ${allSales.length}`);
    allSales.forEach((sale, index) => {
      this.logger.debug(`[getSalesByDateRange] DEBUG Sale ${index}: id=${sale.id}, status=${sale.status}, cashRegisterId=${sale.cashRegisterId}, amount=${sale.totalAmount}`);
    });
    
    // Construir la condición WHERE dinámicamente
    const whereCondition: any = {
      createdAt: Between(start, end),
      status: SaleStatus.COMPLETED,
    };
    
    // Si se especifica cashRegisterId, filtrar por esa caja específicamente
    if (cashRegisterId) {
      whereCondition.cashRegisterId = cashRegisterId;
      this.logger.debug(`[getSalesByDateRange] Filtrando por cashRegisterId: ${cashRegisterId}`);
    } else {
      this.logger.debug(`[getSalesByDateRange] Mostrando TODAS las ventas (sin filtrar por cashRegisterId)`);
    }
    
    const sales = await this.saleRepository.find({
      where: whereCondition,
      relations: ['items', 'items.product', 'member'],
      order: { createdAt: 'DESC' },
    });
    
    this.logger.debug(`[getSalesByDateRange] Found ${sales.length} completed sales`);
    
    if (sales.length > 0) {
      this.logger.debug(`[getSalesByDateRange] First sale: id=${sales[0].id}, amount=${sales[0].totalAmount}, status=${sales[0].status}, date=${sales[0].createdAt}`);
      // Log todas las ventas con sus estados
      sales.forEach((sale, index) => {
        this.logger.debug(`[getSalesByDateRange] Sale ${index}: id=${sale.id}, status=${sale.status}, items=${sale.items?.length || 0}`);
      });
    }
    
    // Transformar sales para incluir subtotal en items
    return sales.map(sale => this.transformSaleWithSubtotals(sale));
  }

  private transformSaleWithSubtotals(sale: any) {
    return {
      ...sale,
      items: sale.items?.map((item: any) => ({
        ...item,
        subtotal: Number(item.unitPrice) * Number(item.quantity),
      })) || [],
    };
  }

  async getTopSellingProducts(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.saleRepository
      .createQueryBuilder('sale')
      .innerJoinAndSelect('sale.items', 'items')
      .innerJoinAndSelect('items.product', 'product')
      .where('sale.createdAt >= :startDate', { startDate })
      .getMany();

    const productMap = new Map();
    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        const key = item.productId;
        if (productMap.has(key)) {
          productMap.get(key).quantity += item.quantity;
          productMap.get(key).revenue +=
            item.quantity * Number(item.unitPrice);
        } else {
          productMap.set(key, {
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            revenue: item.quantity * Number(item.unitPrice),
          });
        }
      });
    });

    return Array.from(productMap.values()).sort(
      (a, b) => b.quantity - a.quantity,
    );
  }

  async getDailyRevenue(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const sales = await this.saleRepository.find({
      where: {
        createdAt: Between(start, end),
      },
      relations: ['items'],
    });

    const dailyMap = new Map();
    sales.forEach((sale) => {
      const date = sale.createdAt.toISOString().split('T')[0];
      const revenue = Number(sale.totalAmount) - Number(sale.discount);

      if (dailyMap.has(date)) {
        dailyMap.get(date).revenue += revenue;
        dailyMap.get(date).transactions += 1;
      } else {
        dailyMap.set(date, {
          date,
          revenue,
          transactions: 1,
        });
      }
    });

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
  }
}
