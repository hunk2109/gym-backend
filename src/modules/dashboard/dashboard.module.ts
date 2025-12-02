import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../../entities/user.entity';
import { Sale } from '../../entities/sale.entity';
import { Employee } from '../../entities/employee.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Sale, Employee])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
