import { Controller, Get, Query } from '@nestjs/common';
import { CronLoggingService } from './cron-logging.service';

@Controller('cron-logs')
export class CronLoggingController {
  constructor(private readonly cronLoggingService: CronLoggingService) {}

  @Get('recent')
  async getRecentLogs(@Query('limit') limit: string = '50') {
    return this.cronLoggingService.getRecentLogs(parseInt(limit) || 50);
  }

  @Get('by-name/:cronName')
  async getLogsByCronName(
    @Query('cronName') cronName: string,
    @Query('limit') limit: string = '20',
  ) {
    return this.cronLoggingService.getLogsByCronName(cronName, parseInt(limit) || 20);
  }

  @Get('stats')
  async getCronStats() {
    return this.cronLoggingService.getCronStats();
  }
}
