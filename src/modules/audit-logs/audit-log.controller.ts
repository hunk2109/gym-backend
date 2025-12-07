import { Controller, Post, Get, Body, Query, UseGuards, Request, Req, Param, Inject } from '@nestjs/common';
import { getRepository, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller('audit-logs')
export class AuditLogController {
  constructor(
    private readonly auditLogService: AuditLogService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  @Post()
  async createAuditLog(
    @Body() createAuditLogDto: any,
    @Req() req: any,
  ) {
    try {
      // Intentar obtener el usuario del JWT si está disponible
      let userId = null;
      
      // Primero intentar desde req.user (si JWT guard pasó)
      if (req.user) {
        userId = req.user.userId || req.user.id || req.user.sub || null;
      } 
      // Si no hay req.user, intentar parsear manualmente el JWT
      else if (req.headers.authorization) {
        try {
          const token = req.headers.authorization.replace('Bearer ', '');
          // Decodificar JWT sin verificar firma (solo para obtener el payload)
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(parts[1], 'base64').toString('utf-8')
            );
            userId = payload.sub || payload.userId || null;
          }
        } catch (e) {
          // Silenciar errores de parsing
        }
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const userAgent = req.get('user-agent');

      // Determinar el userId final (del JWT o del DTO)
      const finalUserId = userId || createAuditLogDto.userId;

      // Obtener el nombre del usuario si tenemos el userId
      let userName: string | null = createAuditLogDto.userName || null;
      if (finalUserId && !userName) {
        try {
          const user = await this.userRepository.findOne({ where: { id: finalUserId } });
          if (user) {
            // Construir nombre a partir de firstName y lastName, o usar email como fallback
            userName = user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}` 
              : user.email;
          }
        } catch (e) {
          // Silenciar errores de búsqueda
        }
      }

      return await this.auditLogService.create({
        ...createAuditLogDto,
        userId: finalUserId,
        userName: userName || 'Sistema',
        ipAddress,
        userAgent,
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
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
