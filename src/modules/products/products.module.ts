import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { CashRegister } from '../../entities/cash-register.entity';
import { CashRegisterTransaction } from '../../entities/cash-register-transaction.entity';
import { AccountPayable } from '../../entities/account-payable.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { WhatsappSettingsModule } from '../whatsapp-settings/whatsapp-settings.module';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, CashRegister, CashRegisterTransaction, AccountPayable]),
    AuthModule,
    AuditLogModule,
    EmailSettingsModule,
    WhatsappSettingsModule,
    GymSettingsModule,
  ],
  providers: [ProductService],
  controllers: [ProductController],
  exports: [ProductService],
})
export class ProductsModule {}
