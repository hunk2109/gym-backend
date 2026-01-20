import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: any, res: Response, next: NextFunction) {
    const userId = req.user?.userId;
    
    if (userId) {
      // Guardar en un contexto accesible globalmente (en la request)
      req.auditUserId = userId;
      console.log(`[AuditMiddleware] Asignado auditUserId a request:`, userId);
    }
    
    next();
  }
}
