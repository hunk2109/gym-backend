import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../../entities/product.entity';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AuthModule } from '../auth/auth.module';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { WhatsappSettingsModule } from '../whatsapp-settings/whatsapp-settings.module';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
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
