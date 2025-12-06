import { BadRequestException, Injectable } from '@nestjs/common';

interface ValidationRules {
  minAmount?: number;
  maxAmount?: number;
  maxDiscrepancy?: number;
  requireBillBreakdown?: boolean;
  requireReceiptPhoto?: boolean;
}

@Injectable()
export class CashRegisterValidationService {
  private defaultRules: ValidationRules = {
    minAmount: 0.01,
    maxAmount: 100000,
    maxDiscrepancy: 1000,
    requireBillBreakdown: true,
    requireReceiptPhoto: false,
  };

  validateOpeningAmount(amount: number, rules: ValidationRules = {}): boolean {
    const finalRules = { ...this.defaultRules, ...rules };

    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new BadRequestException('El monto debe ser un número válido');
    }

    if (amount < (finalRules.minAmount || 0)) {
      throw new BadRequestException(`El monto mínimo es RD$ ${finalRules.minAmount}`);
    }

    if (amount > (finalRules.maxAmount || 100000)) {
      throw new BadRequestException(`El monto máximo es RD$ ${finalRules.maxAmount}`);
    }

    return true;
  }

  validateClosingAmount(
    closingAmount: number,
    expectedAmount: number,
    rules: ValidationRules = {},
  ): { isValid: boolean; discrepancy: number; severity: string } {
    const finalRules = { ...this.defaultRules, ...rules };

    this.validateOpeningAmount(closingAmount, finalRules);

    const discrepancy = closingAmount - expectedAmount;
    const discrepancyPercentage = Math.abs((discrepancy / expectedAmount) * 100);

    const severity =
      Math.abs(discrepancy) > 500
        ? 'CRITICAL'
        : Math.abs(discrepancy) > 200
        ? 'HIGH'
        : Math.abs(discrepancy) > 100
        ? 'MEDIUM'
        : 'LOW';

    return {
      isValid: Math.abs(discrepancy) <= (finalRules.maxDiscrepancy || 1000),
      discrepancy,
      severity,
    };
  }

  validateBillBreakdown(
    breakdown: Record<string, number>,
    expectedTotal: number,
  ): { isValid: boolean; actual: number; difference: number } {
    if (!breakdown || typeof breakdown !== 'object') {
      throw new BadRequestException('El desglose de billetes debe ser un objeto válido');
    }

    const billDenominations = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 2000];
    let actualTotal = 0;

    for (const [denomination, count] of Object.entries(breakdown)) {
      const denom = parseInt(denomination);

      if (!billDenominations.includes(denom)) {
        throw new BadRequestException(`Denominación de billete inválida: RD$ ${denom}`);
      }

      if (!Number.isInteger(count) || count < 0) {
        throw new BadRequestException(
          `Cantidad de billetes RD$ ${denom} debe ser un número entero no negativo`,
        );
      }

      actualTotal += denom * (count as number);
    }

    const difference = Math.abs(actualTotal - expectedTotal);

    return {
      isValid: difference <= 1, // Permite máximo 1 peso de diferencia por redondeo
      actual: actualTotal,
      difference,
    };
  }

  validateReceiptData(
    receipts: Array<{ date: string; amount: number; description?: string }>,
  ): boolean {
    if (!Array.isArray(receipts)) {
      throw new BadRequestException('Los recibos deben ser un array');
    }

    for (const receipt of receipts) {
      if (!receipt.date || !receipt.amount) {
        throw new BadRequestException('Cada recibo debe tener fecha y monto');
      }

      if (isNaN(new Date(receipt.date).getTime())) {
        throw new BadRequestException(`Fecha de recibo inválida: ${receipt.date}`);
      }

      if (typeof receipt.amount !== 'number' || receipt.amount < 0) {
        throw new BadRequestException('El monto del recibo debe ser un número positivo');
      }
    }

    return true;
  }

  calculateAllowedDiscrepancy(salesVolume: number): number {
    // Discrepancia permitida basada en volumen de ventas
    // Más ventas = más margen de error permitido
    if (salesVolume < 100) return 50; // Máx RD$50 para volumen bajo
    if (salesVolume < 500) return 100; // Máx RD$100 para volumen medio
    if (salesVolume < 1000) return 200; // Máx RD$200 para volumen alto
    return 300; // Máx RD$300 para volumen muy alto
  }

  generateValidationReport(
    openingAmount: number,
    closingAmount: number,
    expectedAmount: number,
    billBreakdown: Record<string, number>,
    totalSales: number,
  ): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
    report: string;
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Validar apertura
    try {
      this.validateOpeningAmount(openingAmount);
    } catch (e) {
      errors.push(`Error en apertura: ${e.message}`);
    }

    // Validar cierre
    const closingValidation = this.validateClosingAmount(
      closingAmount,
      expectedAmount,
      { maxDiscrepancy: this.calculateAllowedDiscrepancy(totalSales) },
    );

    if (!closingValidation.isValid) {
      errors.push(
        `Diferencia excesiva: RD$ ${Math.abs(closingValidation.discrepancy).toFixed(2)} (Severidad: ${closingValidation.severity})`,
      );
    } else if (closingValidation.severity === 'HIGH' || closingValidation.severity === 'MEDIUM') {
      warnings.push(
        `Discrepancia detectada: RD$ ${Math.abs(closingValidation.discrepancy).toFixed(2)} (${closingValidation.severity})`,
      );
    }

    // Validar desglose de billetes
    try {
      const breakdownValidation = this.validateBillBreakdown(billBreakdown, closingAmount);
      if (!breakdownValidation.isValid) {
        warnings.push(
          `Diferencia en desglose de billetes: RD$ ${breakdownValidation.difference.toFixed(2)}`,
        );
      }
    } catch (e) {
      errors.push(`Error en desglose: ${e.message}`);
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
      report: this._generateReport({
        openingAmount,
        closingAmount,
        expectedAmount,
        totalSales,
        discrepancy: closingAmount - expectedAmount,
        warnings,
        errors,
      }),
    };
  }

  private _generateReport(data: any): string {
    return `
REPORTE DE VALIDACIÓN DE CIERRE DE CAJA
=====================================

APERTURA: RD$ ${data.openingAmount.toFixed(2)}
VENTAS DEL DÍA: RD$ ${data.totalSales.toFixed(2)}
MONTO ESPERADO: RD$ ${data.expectedAmount.toFixed(2)}
MONTO CONTADO: RD$ ${data.closingAmount.toFixed(2)}
DIFERENCIA: RD$ ${data.discrepancy.toFixed(2)}

VALIDACIÓN:
- Total: ${data.errors.length === 0 ? '✓ VÁLIDA' : '✗ CON ERRORES'}
- Advertencias: ${data.warnings.length}
- Errores: ${data.errors.length}

${data.warnings.length > 0 ? `ADVERTENCIAS:\n${data.warnings.map((w) => `- ${w}`).join('\n')}` : ''}

${data.errors.length > 0 ? `ERRORES:\n${data.errors.map((e) => `- ${e}`).join('\n')}` : ''}
    `.trim();
  }
}
