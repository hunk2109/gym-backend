import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { AuditLogModule } from '../audit-logs/audit-log.module';
import { EmailSettingsModule } from '../email-settings/email-settings.module';
import { ModulesManagementModule } from '../modules-management/modules-management.module';
import { GymSettingsModule } from '../gym-settings/gym-settings.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, User]),
    AuditLogModule,
    EmailSettingsModule,
    ModulesManagementModule,
    GymSettingsModule,
    SyncModule,
  ],
  providers: [EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
