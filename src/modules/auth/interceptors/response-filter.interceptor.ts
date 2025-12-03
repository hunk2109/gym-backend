import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseFilterService } from '../services/response-filter.service';
import { UserRole } from '../../../entities/user.entity';

/**
 * Interceptor que filtra datos sensibles de las respuestas según el rol del usuario
 * Se aplica globalmente para asegurar que nunca se expongan datos sensibles
 */
@Injectable()
export class ResponseFilterInterceptor implements NestInterceptor {
  constructor(private readonly responseFilterService: ResponseFilterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      map((response) => {
        // Si no hay usuario autenticado, retornar respuesta sin filtrar
        if (!user) {
          return response;
        }

        // Si la respuesta es null o undefined, retornar tal cual
        if (!response) {
          return response;
        }

        // Determinar el tipo de filtrado según la ruta
        const route = request.path;
        let filterType: string | null = null;

        if (route.includes('/user-roles') || route.includes('/users')) {
          filterType = 'user';
        } else if (route.includes('/payments') || route.includes('/sales')) {
          filterType = 'financial';
        } else if (route.includes('/members')) {
          filterType = 'member';
        } else if (route.includes('/products')) {
          filterType = 'product';
        } else if (route.includes('/classes') || route.includes('/enrollments')) {
          filterType = 'class';
        } else if (route.includes('/equipment')) {
          filterType = 'equipment';
        }

        // Si se identificó un tipo de filtrado, aplicar
        if (filterType) {
          return this.responseFilterService.filterResponse(
            response,
            user.role,
            filterType,
            user.sub, // userId
          );
        }

        return response;
      }),
    );
  }
}
