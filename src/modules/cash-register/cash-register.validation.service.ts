import { Injectable } from '@nestjs/common';
import { CashRegister } from '../../entities/cash-register.entity';

@Injectable()
export class CashRegisterValidationService {
  /**
   * Valida que el monto de cierre sea válido
   */
  validateClosingAmount(
    closingAmount: number,
    expectedAmount: number,
    allowedVariance: number = 100, // RD$ 100
  ): {
    isValid: boolean;
    severity: 'success' | 'warning' | 'error';
    message: string;
  } {
    const difference = Math.abs(closingAmount - expectedAmount);

    if (difference === 0) {
      return {
        isValid: true,
        severity: 'success',
        message: 'Cierre perfectamente balanceado',
      };
    }

    if (difference < 1) {
      // Centavos
      return {
        isValid: true,
        severity: 'success',
        message: 'Cierre balanceado (diferencia de centavos)',
      };
    }

    if (difference <= allowedVariance) {
      return {
        isValid: true,
        severity: 'warning',
        message: `Cierre con discrepancia menor a RD$ ${allowedVariance}`,
      };
    }

    return {
      isValid: false,
      severity: 'error',
      message: `Discrepancia significativa: RD$ ${difference.toFixed(2)}`,
    };
  }

  /**
   * Valida que el desglose de billetes sea válido
   */
  validateBillBreakdown(
    billBreakdown: Record<string, number>,
    totalAmount: number,
  ): {
    isValid: boolean;
    calculatedTotal: number;
    message: string;
  } {
    const denominations = {
      '1': 1,
      '5': 5,
      '10': 10,
      '25': 25,
      '50': 50,
      '100': 100,
      '200': 200,
      '500': 500,
      '1000': 1000,
      '2000': 2000,
    };

    let calculatedTotal = 0;

    for (const [denom, count] of Object.entries(billBreakdown)) {
      if (!denominations[denom]) {
        return {
          isValid: false,
          calculatedTotal: 0,
          message: `Denominación inválida: RD$ ${denom}`,
        };
      }

      if (count < 0 || !Number.isInteger(count)) {
        return {
          isValid: false,
          calculatedTotal: 0,
          message: `Cantidad inválida para RD$ ${denom}: ${count}`,
        };
      }

      calculatedTotal += denominations[denom] * count;
    }

    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      return {
        isValid: false,
        calculatedTotal,
        message: `Desglose no coincide: esperado RD$ ${totalAmount.toFixed(2)}, calculado RD$ ${calculatedTotal.toFixed(2)}`,
      };
    }

    return {
      isValid: true,
      calculatedTotal,
      message: 'Desglose de billetes válido',
    };
  }

  /**
   * Detecta patrones sospechosos
   */
  detectSuspiciousPatterns(
    registers: CashRegister[],
  ): { suspended: boolean; reason?: string; riskScore: number } {
    if (registers.length === 0) {
      return { suspended: false, riskScore: 0 };
    }

    let riskScore = 0;
    const lastRegisters = registers.slice(0, 10); // Últimos 10 cierres

    // Contar discrepancias consecutivas
    let consecutiveDiscrepancies = 0;
    for (const reg of lastRegisters) {
      if (Math.abs(reg.difference) > 0) {
        consecutiveDiscrepancies++;
        riskScore += 10;
      } else {
        consecutiveDiscrepancies = 0;
      }
    }

    if (consecutiveDiscrepancies >= 5) {
      return {
        suspended: true,
        reason: `${consecutiveDiscrepancies} cierres consecutivos con discrepancia`,
        riskScore: Math.min(riskScore, 100),
      };
    }

    // Verificar diferencias grandes
    const largeDifferences = lastRegisters.filter(
      r => Math.abs(r.difference) > 500,
    ).length;
    if (largeDifferences >= 3) {
      riskScore += 30;
      return {
        suspended: true,
        reason: `${largeDifferences} cierres con grandes discrepancias`,
        riskScore: Math.min(riskScore, 100),
      };
    }

    // Patrones de dinero faltante
    const missingMoneyPatterns = lastRegisters.filter(
      r => r.difference < -100,
    ).length;
    if (missingMoneyPatterns >= 3) {
      riskScore += 25;
    }

    return {
      suspended: riskScore > 60,
      reason:
        riskScore > 60
          ? 'Patrones sospechosos detectados'
          : undefined,
      riskScore,
    };
  }

  /**
   * Valida horarios permitidos para cierre
   */
  validateClosingTime(
    closingTime: Date,
    allowedStartHour: number = 21, // 9 PM
    allowedEndHour: number = 23, // 11 PM
  ): { isValid: boolean; message: string } {
    const hour = closingTime.getHours();

    if (hour >= allowedStartHour && hour < allowedEndHour) {
      return {
        isValid: true,
        message: 'Horario de cierre válido',
      };
    }

    return {
      isValid: false,
      message: `Cierre fuera de horario permitido (${allowedStartHour}:00 - ${allowedEndHour}:00)`,
    };
  }
}
