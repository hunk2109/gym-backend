import { Injectable, HttpStatus } from '@nestjs/common';

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path?: string;
}

@Injectable()
export class ResponseUtil {
  static successResponse(data: any, message: string = 'Operación exitosa', statusCode: number = HttpStatus.OK): any {
    return {
      statusCode,
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static errorResponse(
    error: string,
    message: string = 'Error en la operación',
    statusCode: number = HttpStatus.BAD_REQUEST,
    path?: string,
  ): ApiErrorResponse {
    return {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  static paginatedResponse(data: any[], total: number, page: number, limit: number, message: string = 'Datos obtenidos'): any {
    const pages = Math.ceil(total / limit);

    return {
      statusCode: HttpStatus.OK,
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNextPage: page < pages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  static createdResponse(data: any, message: string = 'Recurso creado exitosamente'): any {
    return {
      statusCode: HttpStatus.CREATED,
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static noContentResponse(message: string = 'Operación completada'): any {
    return {
      statusCode: HttpStatus.NO_CONTENT,
      success: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }
}
