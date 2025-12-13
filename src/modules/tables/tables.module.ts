import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '../../entities/table.entity';
import { TableAccount } from '../../entities/table-account.entity';
import { TableAccountItem } from '../../entities/table-account-item.entity';
import { Product } from '../../entities/product.entity';
import { TablesService } from './tables.service';
import { TableAccountsService } from './table-accounts.service';
import { TablesController } from './tables.controller';
import { TableAccountsController } from './table-accounts.controller';
import { AuthModule } from '../auth/auth.module';
import { SalesModule } from '../sales/sales.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Table, TableAccount, TableAccountItem, Product]),
    AuthModule,
    forwardRef(() => SalesModule),
  ],
  providers: [TablesService, TableAccountsService],
  controllers: [TablesController, TableAccountsController],
  exports: [TablesService, TableAccountsService],
})
export class TablesModule {}
