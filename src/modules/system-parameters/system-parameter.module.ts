import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemParameterService } from './system-parameter.service';
import { SystemParameterController } from './system-parameter.controller';
import { SystemParameter } from '../../entities/system-parameter.entity';
import { AuditLog } from '../../entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SystemParameter, AuditLog])],
  providers: [SystemParameterService],
  controllers: [SystemParameterController],
  exports: [SystemParameterService],
})
export class SystemParameterModule {}
