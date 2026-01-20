import { Injectable } from '@nestjs/common';
import { EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { Payment } from './payment.entity';
import { AuditContextInterceptor } from '../common/interceptors/audit-context.interceptor';

@Injectable()
@EventSubscriber()
export class PaymentSubscriber implements EntitySubscriberInterface<Payment> {
  listenTo() {
    return Payment;
  }

  beforeInsert(event: InsertEvent<Payment>) {
    const entity = event.entity as Payment;
    
    // Obtener el userId del contexto global si no está ya asignado
    if (!entity.createdBy) {
      // Intentar obtener desde el queryRunner (si está disponible en el contexto)
      const dataSource = event.manager.connection;
      const currentUserId = (dataSource as any).currentUserId;
      
      if (currentUserId) {
        entity.createdBy = currentUserId;
        console.log(`[PaymentSubscriber] beforeInsert - Asignado createdBy:`, currentUserId);
      }
    }
    
    if (!entity.updatedBy) {
      const dataSource = event.manager.connection;
      const currentUserId = (dataSource as any).currentUserId;
      
      if (currentUserId) {
        entity.updatedBy = currentUserId;
        console.log(`[PaymentSubscriber] beforeInsert - Asignado updatedBy:`, currentUserId);
      }
    }
    
    console.log(`[PaymentSubscriber] beforeInsert - createdBy:`, entity.createdBy, `updatedBy:`, entity.updatedBy);
  }

  beforeUpdate(event: UpdateEvent<Payment>) {
    const entity = event.entity as Payment;
    
    // Asignar updatedBy automáticamente si no está asignado
    if (!entity.updatedBy) {
      const dataSource = event.manager.connection;
      const currentUserId = (dataSource as any).currentUserId;
      
      if (currentUserId) {
        entity.updatedBy = currentUserId;
        console.log(`[PaymentSubscriber] beforeUpdate - Asignado updatedBy:`, currentUserId);
      }
    }
    
    console.log(`[PaymentSubscriber] beforeUpdate - updatedBy:`, entity.updatedBy);
  }
}

