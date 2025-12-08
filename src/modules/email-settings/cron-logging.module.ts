import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CronExecutionLog } from '../../entities/cron-execution-log.entity';
import { CronLoggingService } from './cron-logging.service';
import { CronLoggingController } from './cron-logging.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CronExecutionLog])],
  providers: [CronLoggingService],
  controllers: [CronLoggingController],
  exports: [CronLoggingService],
})
export class CronLoggingModule {}
