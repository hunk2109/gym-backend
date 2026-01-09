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

  async getAllSales(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [sales, total] = await this.saleRepository.findAndCount({
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

    // Obtener el cash register abierto para este usuario
    const openCashRegister = await this.cashRegisterService.getTodayRegister(userId);
    const cashRegisterId = openCashRegister?.id || null;
    console.log('[🔴 SalesService.createSale] Open cash register:', cashRegisterId);

    // Create sale
    const sale = this.saleRepository.create({
      memberId: createSaleDto.memberId,
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

  async deleteSale(id: string) {
    const sale = await this.getSaleById(id);

    // Solo anular si no está ya anulada
    if (sale.status === SaleStatus.CANCELLED) {
      throw new BadRequestException('Esta venta ya ha sido anulada');
    }

    // Restore stock
    for (const item of sale.items) {
      await this.productService.addStock(
        item.productId,
        item.quantity,
      );
    }

    // Cambiar estado a 'cancelled' en lugar de eliminar
    await this.saleRepository.update(id, { status: SaleStatus.CANCELLED });
    this.logger.warn(`[SENSITIVE] Sale cancelled: ${id}, Amount: ${sale.totalAmount}`);
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
