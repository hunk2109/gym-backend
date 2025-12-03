import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sale } from '../../entities/sale.entity';
import { SaleItem } from '../../entities/sale-item.entity';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { ProductsModule } from '../products/products.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale, SaleItem]),
    ProductsModule,
    AuthModule,
  ],
  providers: [SalesService],
  controllers: [SalesController],
})
export class SalesModule {}
