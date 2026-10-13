import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { PermissionsService } from '../auth/services/permissions.service';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { EmailService } from '../email-settings/email.service';
import { WhatsappService } from '../whatsapp-settings/whatsapp.service';
import { GymSettingsService } from '../gym-settings/gym-settings.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly permissionsService: PermissionsService,
    private readonly auditLogService: AuditLogService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly gymSettingsService: GymSettingsService,
  ) {}

  async getAllProducts(page = 1, limit = 10) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
    const [products, total] = await this.productRepository.findAndCount({
      skip,
      take: limitNum,
      order: { createdAt: 'DESC' },
    });
    this.logger.debug(`[Products] Retrieved ${products.length} products, total: ${total}`);
    return {
      products,
      data: products,
      total,
      page,
      lastPage: Math.ceil(total / limitNum),
    };
  }

  async getProductById(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    return product;
  }

  async createProduct(createProductDto: CreateProductDto) {
    this.logger.debug(`[Products] Creating product with DTO:`, createProductDto);
    const product = this.productRepository.create({
      ...createProductDto,
      purchaseDate: new Date(createProductDto.purchaseDate),
      expiryDate: createProductDto.expiryDate ? new Date(createProductDto.expiryDate) : null,
      quantityAvailable: createProductDto.quantity,
    });
    this.logger.debug(`[Products] Product entity created:`, product);
    const saved = await this.productRepository.save(product);
    this.logger.log(`[Product] Product created successfully. ID: ${saved.id}, Name: ${saved.name}, Quantity: ${saved.quantityAvailable}`);
    return saved;
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto, authUser?: any) {
    this.logger.debug(`[Products] Attempting to update product ID: ${id}`, updateProductDto);
    
    // Validar que el producto existe
    const oldProduct = await this.getProductById(id);
    if (!oldProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    const result = await this.productRepository.update(id, updateProductDto);
    this.logger.debug(`[Products] Update result:`, result);
    
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found or update failed`);
    }
    
    const updatedProduct = await this.getProductById(id);
    const quantityAdded = typeof updateProductDto.quantityAvailable === 'number'
      ? updateProductDto.quantityAvailable - oldProduct.quantityAvailable
      : 0;

    // Registrar cambios en auditoría
    try {
      const userId = authUser?.id || authUser?.sub || authUser?.userId;
      const userName = authUser?.email || 'Sistema';
      
      await this.auditLogService.create({
        action: 'PRODUCT_UPDATED',
        module: 'PRODUCTS',
        description: `Producto actualizado: ${oldProduct.name} (ID: ${id})`,
        userId: userId,
        userName: userName,
        oldValue: {
          name: oldProduct.name,
          description: oldProduct.description,
          price: oldProduct.price,
          quantityAvailable: oldProduct.quantityAvailable,
          category: oldProduct.category,
          cost: oldProduct.cost,
        },
        newValue: updateProductDto,
      });
    } catch (error) {
      this.logger.error('Error logging product update:', error);
      // No fallar la operación si el log falla
    }

    if (quantityAdded > 0) {
      try {
        await this.sendProductEntryNotifications(updatedProduct, quantityAdded);
      } catch (error) {
        this.logger.error('Error sending product entry notification after update:', error);
      }
    }
    
    return updatedProduct;
  }

  async deleteProduct(id: string) {
    const product = await this.getProductById(id);
    await this.productRepository.remove(product);
    this.logger.warn(`[SENSITIVE] Product deleted. ID: ${id}, Name: ${product.name}`);
  }

  async getProductsByCategory(category: string) {
    return this.productRepository.find({
      where: { category },
      order: { createdAt: 'DESC' },
    });
  }

  async getLowStockProducts(threshold = 10) {
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.quantityAvailable <= :threshold', { threshold })
      .orWhere('product.isActive = :isActive', { isActive: false })
      .orderBy('product.quantityAvailable', 'ASC')
      .getMany();
  }

  async getExpiredProducts() {
    const now = new Date();
    return this.productRepository
      .createQueryBuilder('product')
      .where('product.expiryDate < :now', { now })
      .orderBy('product.expiryDate', 'ASC')
      .getMany();
  }

  async updateStock(id: string, quantity: number) {
    const product = await this.getProductById(id);
    product.quantityAvailable = quantity;
    return this.productRepository.save(product);
  }

  async searchProducts(query: string) {
    return this.productRepository
      .createQueryBuilder('product')
      .where('LOWER(product.name) LIKE LOWER(:query)', { query: `%${query}%` })
      .orWhere('LOWER(product.description) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .getMany();
  }

  async addStock(id: string, quantity: number) {
    const product = await this.getProductById(id);
    product.quantityAvailable += quantity;
    const savedProduct = await this.productRepository.save(product);

    try {
      await this.auditLogService.create({
        action: 'PRODUCT_STOCK_ADDED',
        module: 'PRODUCTS',
        description: `Entrada de stock para producto ${product.name}: +${quantity}`,
        userName: 'Sistema',
        newValue: { productId: product.id, quantityAdded: quantity, quantityAvailable: savedProduct.quantityAvailable },
      });
    } catch (error) {
      this.logger.error('Error logging product stock addition:', error);
    }

    try {
      await this.sendProductEntryNotifications(savedProduct, quantity);
    } catch (error) {
      this.logger.error('Error sending product entry notification:', error);
    }

    return savedProduct;
  }

  async removeStock(id: string, quantity: number) {
    const product = await this.getProductById(id);
    if (product.quantityAvailable < quantity) {
      throw new Error('Insufficient stock');
    }
    product.quantityAvailable -= quantity;
    return this.productRepository.save(product);
  }

  private async sendProductEntryNotifications(product: Product, quantityAdded: number) {
    const settings = await this.gymSettingsService.getSettings();
    if (!settings) {
      this.logger.debug('[Products] No gym settings found; skipping product entry notifications.');
      return;
    }

    const recipients = settings.closingReportRecipients || [];
    if (!Array.isArray(recipients) || recipients.length === 0) {
      this.logger.debug('[Products] No closingReportRecipients configured; skipping product entry notifications.');
      return;
    }

    const notificationChannel = settings.notificationChannel || 'both';
    const unitCost = Number(product.cost ?? product.price ?? 0);
    const entryTotal = unitCost * quantityAdded;
    const subject = `Entrada de producto: ${product.name}`;
    const htmlContent = `
      <h2>Entrada de producto</h2>
      <p>Se ha ingresado <strong>${quantityAdded}</strong> unidades del producto <strong>${product.name}</strong>.</p>
      <p>Costo unitario: RD$ ${unitCost.toFixed(2)}</p>
      <p>Total de la entrada: <strong>RD$ ${entryTotal.toFixed(2)}</strong></p>
      <p>Cantidad disponible ahora: <strong>${product.quantityAvailable}</strong></p>
      <p>Categoría: ${product.category || 'N/A'}</p>
    `;
    const plainTextContent = `Entrada de producto\n
Se ha ingresado ${quantityAdded} unidades del producto ${product.name}.\nCosto unitario: RD$ ${unitCost.toFixed(2)}\nTotal de la entrada: RD$ ${entryTotal.toFixed(2)}\nCantidad disponible ahora: ${product.quantityAvailable}\nCategoría: ${product.category || 'N/A'}`;
    const waMessage = `Entrada de producto: ${product.name}\nCantidad ingresada: ${quantityAdded}\nCosto unitario: RD$ ${unitCost.toFixed(2)}\nTotal de la entrada: RD$ ${entryTotal.toFixed(2)}\nDisponible: ${product.quantityAvailable}`;

    for (const recipient of recipients) {
      if ((notificationChannel === 'both' || notificationChannel === 'email') && recipient.sendEmail && recipient.email) {
        try {
          await this.emailService.sendEmailDirect({
            to: recipient.email,
            subject,
            html: htmlContent,
            text: plainTextContent,
          });
          this.logger.log(`[Products] Notification email sent to ${recipient.email}`);
        } catch (error) {
          this.logger.error(`[Products] Failed to send product entry email to ${recipient.email}:`, error);
        }
      }

      if ((notificationChannel === 'both' || notificationChannel === 'whatsapp') && recipient.sendWhatsapp && recipient.phone) {
        try {
          await this.whatsappService.sendMessage(recipient.phone, waMessage);
          this.logger.log(`[Products] Notification WhatsApp sent to ${recipient.phone}`);
        } catch (error) {
          this.logger.error(`[Products] Failed to send product entry WhatsApp to ${recipient.phone}:`, error);
        }
      }
    }
  }

  async getInventoryValue() {
    const products = await this.productRepository.find();
    const totalValue = products.reduce(
      (sum, product) => sum + Number(product.price) * product.quantityAvailable,
      0,
    );
    return {
      totalValue,
      totalItems: products.length,
      productCount: products.reduce((sum, p) => sum + p.quantityAvailable, 0),
    };
  }
}
