import { Controller, Post, Get, Body, Query, UseGuards, Request, Req } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post()
  async createAuditLog(
    @Body() createAuditLogDto: any,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    return await this.auditLogService.create({
      ...createAuditLogDto,
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    const filters = {
      module,
      action,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return await this.auditLogService.findAll(filters, page, limit);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async findByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return await this.auditLogService.findByUser(userId, page, limit);
  }

  @Get('module/:module')
  @UseGuards(JwtAuthGuard)
  async findByModule(
    @Param('module') module: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ) {
    return await this.auditLogService.findByModule(module, page, limit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await this.auditLogService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
