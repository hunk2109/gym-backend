import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { SystemParameterService } from './system-parameter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/system-parameters')
@UseGuards(JwtAuthGuard)
export class SystemParameterController {
  constructor(private readonly paramService: SystemParameterService) {}

  @Get()
  async getAllParameters() {
    return await this.paramService.getAllParameters();
  }

  @Get(':name')
  async getParameter(@Param('name') name: string) {
    const param = await this.paramService.getParameterByName(name);
    if (!param) {
      return { error: 'Parámetro no encontrado' };
    }
    return param;
  }

  @Post('update')
  async updateParameter(
    @Body() body: { parameterName: string; value: boolean; reason?: string },
    @Request() req: any,
  ) {
    const userId = req.user.id;
    return await this.paramService.updateParameter(
      body.parameterName,
      body.value,
      userId,
      body.reason,
    );
  }

  @Patch('approve/:auditLogId')
  async approveChange(
    @Param('auditLogId') auditLogId: string,
    @Body() body: { approve: boolean; reason?: string },
    @Request() req: any,
  ) {
    const approvedBy = req.user.id;
    await this.paramService.approveParameterChange(
      auditLogId,
      approvedBy,
      body.approve,
      body.reason,
    );
    return { message: 'Cambio procesado' };
  }

  @Get('audit/logs')
  async getAuditLogs(
    @Request() req: any,
  ) {
    return await this.paramService.getAuditLogs();
  }
}
