import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemParameter } from '../entities/system-parameter.entity';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class SystemParameterService {
  constructor(
    @InjectRepository(SystemParameter)
    private paramRepository: Repository<SystemParameter>,
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  async getAllParameters(): Promise<SystemParameter[]> {
    return await this.paramRepository.find();
  }

  async getParameterByName(name: string): Promise<SystemParameter | null> {
    return await this.paramRepository.findOne({
      where: { parameterName: name },
    });
  }

  async updateParameter(
    parameterName: string,
    newValue: boolean,
    userId: string,
    reason?: string,
  ): Promise<SystemParameter> {
    const param = await this.getParameterByName(parameterName);

    if (!param) {
      throw new Error(`Parámetro ${parameterName} no encontrado`);
    }

    const oldValue = param.value;

    // Si requiere aprobación, crear registro de auditoría con estado PENDING
    if (param.requiresApproval) {
      await this.auditRepository.save({
        action: 'PARAMETER_CHANGE_REQUESTED',
        module: param.module,
        description: `Cambio solicitado para ${parameterName}: ${oldValue} → ${newValue}`,
        oldValue,
        newValue,
        userId,
        status: 'PENDING',
        reason,
      });

      // No actualizar directamente, esperar aprobación
      return param;
    }

    // Si no requiere aprobación, actualizar directamente
    param.value = newValue;
    param.updatedBy = userId;
    await this.paramRepository.save(param);

    // Registrar en auditoría
    await this.auditRepository.save({
      action: 'PARAMETER_CHANGED',
      module: param.module,
      description: `${parameterName} cambió de ${oldValue} a ${newValue}`,
      oldValue,
      newValue,
      userId,
      status: 'APPROVED',
      approvedAt: new Date(),
      reason,
    });

    return param;
  }

  async approveParameterChange(
    auditLogId: string,
    approvedBy: string,
    approve: boolean,
    rejectReason?: string,
  ): Promise<void> {
    const auditLog = await this.auditRepository.findOne({
      where: { id: auditLogId, status: 'PENDING' },
    });

    if (!auditLog) {
      throw new Error('Registro de auditoría no encontrado o ya procesado');
    }

    if (approve) {
      // Actualizar el parámetro
      const param = await this.getParameterByName(auditLog.description.split(':')[0].replace('Cambio solicitado para ', '').trim());

      if (param) {
        param.value = auditLog.newValue;
        param.updatedBy = approvedBy;
        await this.paramRepository.save(param);
      }

      // Marcar auditoría como aprobada
      auditLog.status = 'APPROVED';
      auditLog.approvedBy = approvedBy;
      auditLog.approvedAt = new Date();
    } else {
      // Marcar como rechazada
      auditLog.status = 'REJECTED';
      auditLog.approvedBy = approvedBy;
      auditLog.approvedAt = new Date();
      auditLog.reason = rejectReason;
    }

    await this.auditRepository.save(auditLog);
  }

  async getAuditLogs(filters?: {
    module?: string;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    let query = this.auditRepository.createQueryBuilder('audit');

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

    return await query.orderBy('audit.createdAt', 'DESC').getMany();
  }

  // Inicializar parámetros por defecto
  async initializeDefaultParameters(): Promise<void> {
    const defaults = [
      {
        parameterName: 'creditSalesEnabled',
        module: 'SALES',
        value: false,
        description: 'Habilitar ventas a crédito',
        requiresApproval: true,
      },
      {
        parameterName: 'discountsEnabled',
        module: 'SALES',
        value: true,
        description: 'Habilitar descuentos en ventas',
        requiresApproval: false,
      },
      {
        parameterName: 'returnsEnabled',
        module: 'SALES',
        value: false,
        description: 'Habilitar devoluciones',
        requiresApproval: true,
      },
      {
        parameterName: 'editInvoiceEnabled',
        module: 'SALES',
        value: false,
        description: 'Permitir editar facturas',
        requiresApproval: true,
      },
      {
        parameterName: 'bulkSalesEnabled',
        module: 'SALES',
        value: false,
        description: 'Habilitar ventas al por mayor',
        requiresApproval: false,
      },
      {
        parameterName: 'customPricesEnabled',
        module: 'SALES',
        value: false,
        description: 'Permitir precios personalizados',
        requiresApproval: true,
      },
      {
        parameterName: 'deleteProductsEnabled',
        module: 'INVENTORY',
        value: false,
        description: 'Permitir eliminar productos',
        requiresApproval: true,
      },
      {
        parameterName: 'viewReportsEnabled',
        module: 'REPORTS',
        value: true,
        description: 'Permitir ver reportes',
        requiresApproval: false,
      },
    ];

    for (const defaultParam of defaults) {
      const existing = await this.getParameterByName(defaultParam.parameterName);
      if (!existing) {
        await this.paramRepository.save(defaultParam);
      }
    }
  }
}
