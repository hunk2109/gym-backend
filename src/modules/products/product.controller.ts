import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';

@Controller('api/products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // Ver todos los productos
  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  async getAllProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.productService.getAllProducts(page, limit);
  }

  // Ver productos por categoría
  @Get('category/:category')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  async getProductsByCategory(@Param('category') category: string) {
    return this.productService.getProductsByCategory(category);
  }

  // Ver productos con bajo stock - Solo ADMIN/ENCARGADO/EMPLEADO_CAJERO
  @Get('low-stock')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getLowStockProducts() {
    return this.productService.getLowStockProducts();
  }

  // Ver productos expirados - Solo ADMIN/ENCARGADO/EMPLEADO_CAJERO
  @Get('expired')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getExpiredProducts() {
    return this.productService.getExpiredProducts();
  }

  // Buscar productos
  @Get('search')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  async searchProducts(@Query('query') query: string) {
    return this.productService.searchProducts(query);
  }

  // Ver producto por ID
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO, UserRole.EMPLEADO_ENTRENADOR, UserRole.CLIENTE)
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  // Crear producto - Solo ADMIN/ENCARGADO
  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  // Editar producto - Solo ADMIN/ENCARGADO
  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  // Eliminar producto - Solo ADMIN
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }

  // Agregar stock - Solo ADMIN/ENCARGADO/EMPLEADO_CAJERO
  @Post(':id/stock/add')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async addStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.productService.addStock(id, quantity);
  }

  // Remover stock - Solo ADMIN/ENCARGADO/EMPLEADO_CAJERO
  @Post(':id/stock/remove')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async removeStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.removeStock(id, quantity);
  }

  // Ver valor del inventario - Solo ADMIN/ENCARGADO
  @Get('inventory/value')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getInventoryValue() {
    return this.productService.getInventoryValue();
  }
}
