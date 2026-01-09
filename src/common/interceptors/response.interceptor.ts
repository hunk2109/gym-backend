import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;
        
        // Si la respuesta del servicio ya tiene estructura personalizada (como attendances), retornarla así
        if (data?.statusCode && data?.message && (data?.status || data?.attendance)) {
          return data;
        }
        
        // Si la respuesta tiene un mensaje personalizado, usarlo
        let message = data?.message || this.getSuccessMessage(request.method, statusCode);

        return {
          statusCode,
          success: isSuccess,
          message,
          data: data || null,
          timestamp: new Date().toISOString(),
          path: request.url,
        } as ApiResponse;
      }),
    );
  }

  private getSuccessMessage(method: string, statusCode: number): string {
    const methodMessages: { [key: string]: { [key: number]: string } } = {
      GET: {
        200: 'Datos obtenidos exitosamente',
        201: 'Recurso creado exitosamente',
      },
      POST: {
        200: 'Operación completada exitosamente',
        201: 'Recurso creado exitosamente',
      },
      PUT: {
        200: 'Recurso actualizado exitosamente',
      },
      PATCH: {
        200: 'Recurso actualizado parcialmente',
      },
      DELETE: {
        204: 'Recurso eliminado exitosamente',
        200: 'Recurso eliminado exitosamente',
      },
    };

    return methodMessages[method]?.[statusCode] || 'Operación exitosa';
  }
}
