import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { AccessService } from './access.service';
import { ZktecoDeviceService } from './zkteco-device.service';
import { ConfigService } from './config.service';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Payment } from '../../entities/payment.entity';
import { Attendance } from '../../entities/attendance.entity';
import { AppConfig } from '../../entities/app-config.entity';
import { Employee } from '../../entities/employee.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([User, Product, Member, Membership, MemberMembership, Payment, Attendance, AppConfig, Employee]),
  ],
  controllers: [SyncController],
  providers: [SyncService, AccessService, ConfigService, ZktecoDeviceService],
  exports: [SyncService, AccessService, ConfigService, ZktecoDeviceService],
})
export class SyncModule {}
