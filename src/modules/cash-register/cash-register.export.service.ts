import { Injectable } from '@nestjs/common';
import { CashRegister } from '../../entities/cash-register.entity';

@Injectable()
export class CashRegisterExportService {
  /**
   * Exporta datos a CSV
   */
  generateCSV(registers: CashRegister[]): string {
    const headers = [
      'ID',
      'Fecha de Apertura',
      'Monto de Apertura',
      'Monto de Cierre',
      'Monto Esperado',
      'Diferencia',
      'Estado',
      'Fecha de Cierre',
    ];

    const rows = registers.map(reg => [
      reg.id,
      this.formatDate(reg.registerDate),
      this.formatCurrency(reg.openingAmount),
      this.formatCurrency(reg.closingAmount),
      this.formatCurrency(reg.expectedClosure),
      this.formatCurrency(reg.difference),
      reg.isOpen ? 'ABIERTA' : 'CERRADA',
      reg.closedAt ? this.formatDate(reg.closedAt) : 'N/A',
    ]);

    // Combinar headers y filas
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csv;
  }

  /**
   * Genera reporte HTML
   */
  generateHTML(registers: CashRegister[], title: string = 'Reporte de Cajas'): string {
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          background-color: #f5f5f5;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          text-align: center;
          border-bottom: 2px solid #007bff;
          padding-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th {
          background-color: #007bff;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .status-closed {
          background-color: #d4edda;
          color: #155724;
        }
        .status-open {
          background-color: #fff3cd;
          color: #856404;
        }
        .difference-positive {
          color: #28a745;
        }
        .difference-negative {
          color: #dc3545;
        }
        .summary {
          margin-top: 30px;
          padding: 15px;
          background-color: #f8f9fa;
          border-left: 4px solid #007bff;
        }
        .summary h3 {
          margin-top: 0;
          color: #333;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }
        .summary-item:last-child {
          border-bottom: none;
        }
        .summary-label {
          font-weight: bold;
          color: #666;
        }
        .summary-value {
          font-weight: bold;
          color: #333;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #999;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${title}</h1>
        <p style="text-align: center; color: #666;">
          Generado: ${new Date().toLocaleString('es-ES')}
        </p>
        
        <table>
          <thead>
            <tr>
              <th>Fecha de Apertura</th>
              <th>Monto de Apertura</th>
              <th>Monto de Cierre</th>
              <th>Monto Esperado</th>
              <th>Diferencia</th>
              <th>Estado</th>
              <th>Fecha de Cierre</th>
            </tr>
          </thead>
          <tbody>
            ${registers.map(reg => `
              <tr>
                <td>${this.formatDate(reg.registerDate)}</td>
                <td>RD$ ${this.formatCurrency(reg.openingAmount)}</td>
                <td>RD$ ${this.formatCurrency(reg.closingAmount)}</td>
                <td>RD$ ${this.formatCurrency(reg.expectedClosure)}</td>
                <td class="${reg.difference > 0 ? 'difference-positive' : 'difference-negative'}">
                  RD$ ${this.formatCurrency(Math.abs(reg.difference))}
                </td>
                <td class="${reg.isOpen ? 'status-open' : 'status-closed'}">
                  ${reg.isOpen ? 'ABIERTA' : 'CERRADA'}
                </td>
                <td>${reg.closedAt ? this.formatDate(reg.closedAt) : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <h3>Resumen General</h3>
          <div class="summary-item">
            <span class="summary-label">Total de Cajas:</span>
            <span class="summary-value">${registers.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cajas Cerradas:</span>
            <span class="summary-value">${registers.filter(r => !r.isOpen).length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Apertura Total:</span>
            <span class="summary-value">RD$ ${this.formatCurrency(registers.reduce((sum, r) => sum + (r.openingAmount || 0), 0))}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cierre Total:</span>
            <span class="summary-value">RD$ ${this.formatCurrency(registers.reduce((sum, r) => sum + (r.closingAmount || 0), 0))}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Diferencia Total:</span>
            <span class="summary-value ${registers.reduce((sum, r) => sum + (r.difference || 0), 0) >= 0 ? 'difference-positive' : 'difference-negative'}">
              RD$ ${this.formatCurrency(Math.abs(registers.reduce((sum, r) => sum + (r.difference || 0), 0)))}
            </span>
          </div>
        </div>

        <div class="footer">
          <p>Este reporte fue generado automáticamente por el sistema de caja</p>
        </div>
      </div>
    </body>
    </html>
    `;

    return html;
  }

  /**
   * Genera datos en formato JSON
   */
  generateJSON(registers: CashRegister[]): string {
    const data = {
      generatedAt: new Date().toISOString(),
      totalRegisters: registers.length,
      summary: {
        totalOpening: registers.reduce((sum, r) => sum + (r.openingAmount || 0), 0),
        totalClosing: registers.reduce((sum, r) => sum + (r.closingAmount || 0), 0),
        totalDifference: registers.reduce((sum, r) => sum + (r.difference || 0), 0),
      },
      registers: registers.map(reg => ({
        id: reg.id,
        registerDate: reg.registerDate,
        openingAmount: reg.openingAmount,
        closingAmount: reg.closingAmount,
        expectedClosure: reg.expectedClosure,
        difference: reg.difference,
        isOpen: reg.isOpen,
        closedAt: reg.closedAt,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  private formatCurrency(value: number | null | undefined): string {
    if (!value) return '0.00';
    return value.toFixed(2);
  }

  private formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Fecha inválida';
    }
  }
}
