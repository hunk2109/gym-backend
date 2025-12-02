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
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeeRole } from '../../entities/employee.entity';

@Controller('api/employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateEmployeeDto) {
    return this.employeeService.create(createDto);
  }

  @Get()
  async findAll() {
    return this.employeeService.findAll();
  }

  @Get('active')
  async findActive() {
    return this.employeeService.findActive();
  }

  @Get('role/:role')
  async findByRole(@Param('role') role: EmployeeRole) {
    return this.employeeService.findByRole(role);
  }

  @Get('stats')
  async getStats() {
    return this.employeeService.getEmployeeStats();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.employeeService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.employeeService.delete(id);
  }

  @Put(':id/toggle-active')
  @UseGuards(JwtAuthGuard)
  async toggleActive(@Param('id') id: string) {
    return this.employeeService.toggleActive(id);
  }
}
