import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

// Contexto global para almacenar el userId durante la request
const auditContext: Map<string, string> = new Map();

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    
    // Generar un ID único para esta request
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (userId) {
      auditContext.set(requestId, userId);
      console.log(`[AuditContextInterceptor] Guardando userId para requestId ${requestId}:`, userId);
    }
    
    // Almacenar requestId en la request para que el subscriber lo pueda recuperar
    request.auditRequestId = requestId;
    
    return next.handle().pipe(
      // Limpiar después de que se complete la request
      (observable) => {
        return new Observable((subscriber) => {
          observable.subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => {
              auditContext.delete(requestId);
              subscriber.error(err);
            },
            complete: () => {
              auditContext.delete(requestId);
              subscriber.complete();
            },
          });
        });
      }
    );
  }

  static getUserId(requestId: string): string | undefined {
    return auditContext.get(requestId);
  }
}
