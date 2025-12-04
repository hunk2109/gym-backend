import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(data: {
    action: string;
    module: string;
    description: string;
    details?: any;
    oldValue?: any;
    newValue?: any;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...data,
      status: 'COMPLETED',
      createdAt: new Date(),
    });

    return await this.auditLogRepository.save(auditLog);
  }

  async findAll(
    filters?: {
      module?: string;
      action?: string;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number; page: number; lastPage: number }> {
    let query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters?.module) {
      query = query.where('audit.module = :module', { module: filters.module });
    }

    if (filters?.action) {
      query = query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters?.userId) {
      query = query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters?.startDate) {
      query = query.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query = query.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();
    const skip = (page - 1) * limit;

    const data = await query
      .orderBy('audit.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    const lastPage = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      lastPage,
    };
  }

  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async findByModule(
    module: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: { module },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalActions: number;
    actionsByModule: Record<string, number>;
    actionsByType: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
  }> {
    let query = this.auditLogRepository.createQueryBuilder('audit');

    if (startDate) {
      query = query.where('audit.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('audit.createdAt <= :endDate', { endDate });
    }

    const totalActions = await query.getCount();

    // Acciones por módulo
    const actionsByModule = {};
    const moduleData = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.module', 'module')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.module')
      .getRawMany();

    moduleData.forEach((item) => {
      actionsByModule[item.module] = parseInt(item.count);
    });

    // Acciones por tipo
    const actionsByType = {};
    const typeData = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .groupBy('audit.action')
      .getRawMany();

    typeData.forEach((item) => {
      actionsByType[item.action] = parseInt(item.count);
    });

    // Top usuarios
    const topUsers = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.userId IS NOT NULL')
      .groupBy('audit.userId')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      totalActions,
      actionsByModule,
      actionsByType,
      topUsers: topUsers.map((item) => ({
        userId: item.userId,
        count: parseInt(item.count),
      })),
    };
  }

  async cleanup(daysOld: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    await this.auditLogRepository.delete({
      createdAt: Between(new Date(0), cutoffDate),
    });
  }
}
