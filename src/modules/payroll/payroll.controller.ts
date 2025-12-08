import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, UpdatePayrollDto, GeneratePayrollDto, PayrollDeductionOptionsDto } from './dto/payroll.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PayrollStatus } from '../../entities/payroll.entity';

@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreatePayrollDto) {
    return this.payrollService.create(createDto);
  }

  @Get()
  async findAll(
    @Query('month') month?: number,
    @Query('year') year?: number,
    @Query('status') status?: PayrollStatus,
  ) {
    return this.payrollService.findAll(month, year, status);
  }

  @Get('stats')
  async getStats(@Query('month') month: number, @Query('year') year: number) {
    return this.payrollService.getPayrollStats(month, year);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateMonthlyPayroll(@Body() generateDto: GeneratePayrollDto) {
    return this.payrollService.generateMonthlyPayroll(generateDto);
  }

  @Post('generate/with-options')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async generateWithDeductionOptions(@Body() options: PayrollDeductionOptionsDto) {
    return this.payrollService.generateWithDeductionOptions(options);
  }

  @Get('export/:month/:year')
  @UseGuards(JwtAuthGuard)
  async exportToExcel(
    @Param('month') month: number,
    @Param('year') year: number,
    @Res() res: Response,
  ) {
    try {
      const ExcelJS = require('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Nómina');

      // Obtener nóminas del mes/año
      const payrolls = await this.payrollService.findAll(month, year);

      // Configurar encabezados
      worksheet.columns = [
        { header: 'Empleado', key: 'employee', width: 30 },
        { header: 'Salario Base', key: 'baseSalary', width: 15 },
        { header: 'Bonificaciones', key: 'bonuses', width: 15 },
        { header: 'Bono Especial', key: 'holidayBonus', width: 15 },
        { header: 'Deducción AFP', key: 'afpDeduction', width: 15 },
        { header: 'Deducción ISR', key: 'isrDeduction', width: 15 },
        { header: 'Deducción TSS', key: 'tssDeduction', width: 15 },
        { header: 'Otras Deducciones', key: 'otherDeductions', width: 15 },
        { header: 'Total a Pagar', key: 'totalAmount', width: 15 },
        { header: 'Estado', key: 'status', width: 12 },
      ];

      // Agregar datos
      for (const payroll of payrolls) {
        worksheet.addRow({
          employee: payroll.employee ? `${payroll.employee.firstName} ${payroll.employee.lastName}` : 'N/A',
          baseSalary: parseFloat(payroll.baseSalary.toString()),
          bonuses: parseFloat(payroll.bonuses.toString()),
          holidayBonus: parseFloat(payroll.holidayBonus.toString()),
          afpDeduction: parseFloat(payroll.afpDeduction.toString()),
          isrDeduction: parseFloat(payroll.isrDeduction.toString()),
          tssDeduction: parseFloat(payroll.tssDeduction.toString()),
          otherDeductions: parseFloat(payroll.otherDeductions.toString()),
          totalAmount: parseFloat(payroll.totalAmount.toString()),
          status: payroll.status,
        });
      }

      // Formatear como moneda
      const currencyFormat = '$#,##0.00';
      for (let i = 2; i <= payrolls.length + 1; i++) {
        worksheet.getCell(`B${i}`).numFmt = currencyFormat;
        worksheet.getCell(`C${i}`).numFmt = currencyFormat;
        worksheet.getCell(`D${i}`).numFmt = currencyFormat;
        worksheet.getCell(`E${i}`).numFmt = currencyFormat;
        worksheet.getCell(`F${i}`).numFmt = currencyFormat;
        worksheet.getCell(`G${i}`).numFmt = currencyFormat;
        worksheet.getCell(`H${i}`).numFmt = currencyFormat;
        worksheet.getCell(`I${i}`).numFmt = currencyFormat;
      }

      // Configurar respuesta
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="nomina_${month}_${year}.xlsx"`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      res.status(500).json({ error: 'Error al generar Excel: ' + error.message });
    }
  }

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.payrollService.findByEmployeeAndMonth(employeeId, month, year);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.payrollService.findById(id);
  }

  @Put(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approve(@Param('id') id: string) {
    return this.payrollService.approvePayroll(id);
  }

  @Put(':id/mark-paid')
  @UseGuards(JwtAuthGuard)
  async markAsPaid(@Param('id') id: string, @Body('paidBy') paidBy: string) {
    return this.payrollService.markAsPaid(id, paidBy);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePayrollDto,
  ) {
    return this.payrollService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.payrollService.delete(id);
  }
}
