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
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, UpdatePayrollDto, GeneratePayrollDto } from './dto/payroll.dto';
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

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.payrollService.findById(id);
  }

  @Get('employee/:employeeId')
  async findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.payrollService.findByEmployeeAndMonth(employeeId, month, year);
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

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateMonthlyPayroll(@Body() generateDto: GeneratePayrollDto) {
    return this.payrollService.generateMonthlyPayroll(generateDto);
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
}
