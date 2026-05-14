import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AccessService } from './access.service';
import { ConfigService } from './config.service';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Member } from '../../entities/member.entity';
import { Payment } from '../../entities/payment.entity';
import { Attendance } from '../../entities/attendance.entity';
import { AppConfig } from '../../entities/app-config.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Product, Member, Payment, Attendance, AppConfig]),
  ],
  controllers: [SyncController],
  providers: [SyncService, AccessService, ConfigService],
  exports: [SyncService, AccessService, ConfigService],
})
export class SyncModule {}
