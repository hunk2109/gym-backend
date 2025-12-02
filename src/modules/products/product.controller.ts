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
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { ProductService } from './product.service';

@Controller('api/products')
@UseGuards(JwtAuthGuard)
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async getAllProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.productService.getAllProducts(page, limit);
  }

  @Get('category/:category')
  async getProductsByCategory(@Param('category') category: string) {
    return this.productService.getProductsByCategory(category);
  }

  @Get('low-stock')
  async getLowStockProducts() {
    return this.productService.getLowStockProducts();
  }

  @Get('expired')
  async getExpiredProducts() {
    return this.productService.getExpiredProducts();
  }

  @Get('search')
  async searchProducts(@Query('query') query: string) {
    return this.productService.searchProducts(query);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productService.getProductById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productService.createProduct(createProductDto);
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productService.updateProduct(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct(id);
  }

  @Post(':id/stock/add')
  async addStock(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.productService.addStock(id, quantity);
  }

  @Post(':id/stock/remove')
  async removeStock(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
  ) {
    return this.productService.removeStock(id, quantity);
  }

  @Get('inventory/value')
  async getInventoryValue() {
    return this.productService.getInventoryValue();
  }
}
