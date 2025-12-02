import { HttpStatus, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';

export class ValidationUtil {
  static async validateDto<T>(dto: T): Promise<void> {
    const errors = await validate(dto as object);

    if (errors.length > 0) {
      const messages = errors
        .map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints).join(', ')
            : 'Validación fallida';
          return `${error.property}: ${constraints}`;
        })
        .join('; ');

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Error de validación',
        details: messages,
      });
    }
  }

  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input.trim();
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
    return phoneRegex.test(phone);
  }

  static validateDateRange(startDate: Date, endDate: Date): boolean {
    return startDate < endDate;
  }
}
