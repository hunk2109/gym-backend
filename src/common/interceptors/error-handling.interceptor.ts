import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpStatus, BadRequestException, NotFoundException, ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
  details?: any;
}

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      catchError((error) => {
        const errorResponse = this.formatErrorResponse(error, request, response);
        response.status(errorResponse.statusCode);
        return throwError(() => ({ ...errorResponse }));
      }),
    );
  }

  private formatErrorResponse(error: any, request: Request, response: Response): ErrorResponse {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Error interno del servidor';
    let errorType = 'InternalServerError';
    let details: any = undefined;

    // Handle NestJS HTTP exceptions
    if (error.status) {
      statusCode = error.status;
      message = error.message || error.response?.message || 'Error';
      errorType = error.name || 'HttpException';
      details = error.response?.details;
    }
    // Handle specific error types
    else if (error instanceof TypeError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Tipo de dato inválido';
      errorType = 'TypeError';
    } else if (error instanceof SyntaxError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Error de sintaxis en la solicitud';
      errorType = 'SyntaxError';
    } else if (error.name === 'ValidationError') {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Error de validación';
      errorType = 'ValidationError';
      details = error.constraints;
    } else if (error.code === 'ER_DUP_ENTRY') {
      statusCode = HttpStatus.CONFLICT;
      message = 'El registro ya existe';
      errorType = 'ConflictError';
    } else if (error.code === 'ER_NO_REFERENCED_ROW') {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Referencia inválida en los datos';
      errorType = 'ReferenceError';
    }

    return {
      statusCode,
      message,
      error: errorType,
      path: request.url,
      timestamp: new Date().toISOString(),
      details,
    };
  }
}
