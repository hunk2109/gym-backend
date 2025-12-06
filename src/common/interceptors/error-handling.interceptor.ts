import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus, BadRequestException, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse } from './response.interceptor';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      catchError((error) => {
        // Log full error stack
        console.error('[ErrorHandlingInterceptor] Full error:', {
          message: error.message,
          stack: error.stack,
          code: error.code,
          status: error.status,
          name: error.name,
          toString: error.toString(),
        });
        
        const errorResponse = this.formatErrorResponse(error, request, response);
        response.status(errorResponse.statusCode);
        return throwError(() => errorResponse);
      }),
    );
  }

  private formatErrorResponse(error: any, request: Request, response: Response): ApiResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';

    // Handle NestJS HTTP exceptions
    if (error.status) {
      statusCode = error.status;
      message = error.message || error.response?.message || 'Error';
    }
    // Handle specific error types
    else if (error instanceof TypeError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Tipo de dato inválido';
    } else if (error instanceof SyntaxError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Error de sintaxis en la solicitud';
    } else if (error.name === 'ValidationError') {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Error de validación';
    } else if (error.code === 'ER_DUP_ENTRY') {
      statusCode = HttpStatus.CONFLICT;
      message = 'El registro ya existe';
    } else if (error.code === 'ER_NO_REFERENCED_ROW') {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Referencia inválida en los datos';
    }

    // Return response in the same format as ResponseInterceptor for consistency
    return {
      statusCode,
      success: false,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    } as ApiResponse;
  }
}
