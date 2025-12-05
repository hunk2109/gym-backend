import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../../entities/employee.entity';
import { User } from '../../entities/user.entity';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { AuditLogModule } from '../audit-logs/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Employee, User]), AuditLogModule],
  providers: [EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
