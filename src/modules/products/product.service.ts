import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { PermissionsService } from '../auth/services/permissions.service';
import { AuditLogService } from '../audit-logs/audit-log.service';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly permissionsService: PermissionsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getAllProducts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [products, total] = await this.productRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    this.logger.debug(`[Products] Retrieved ${products.length} products, total: ${total}`);
    return {
      products,
      total,
      page,
      lastPage: Math.ceil(total / limit),
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
    
    return this.getProductById(id);
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
    return this.productRepository.save(product);
  }

  async removeStock(id: string, quantity: number) {
    const product = await this.getProductById(id);
    if (product.quantityAvailable < quantity) {
      throw new Error('Insufficient stock');
    }
    product.quantityAvailable -= quantity;
    return this.productRepository.save(product);
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
