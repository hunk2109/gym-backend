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
  Request,
  BadRequestException,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeeRole } from '../../entities/employee.entity';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateEmployeeDto, @Request() req: any) {
    return this.employeeService.create(createDto, req.user);
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
    @Request() req: any,
  ) {
    return this.employeeService.update(id, updateDto, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Request() req: any) {
    try {
      return await this.employeeService.delete(id, req.user);
    } catch (error) {
      if (error.message?.includes('foreign key constraint')) {
        throw new BadRequestException(
          'No se puede eliminar el empleado porque tiene registros asociados (nóminas, auditoría, etc.). El empleado ha sido desactivado.',
        );
      }
      throw error;
    }
  }

  @Put(':id/toggle-active')
  @UseGuards(JwtAuthGuard)
  async toggleActive(@Param('id') id: string, @Request() req: any) {
    return this.employeeService.toggleActive(id, req.user);
  }

  @Post(':id/send-credentials')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sendCredentials(@Param('id') id: string) {
    return this.employeeService.sendCredentials(id);
  }

  @Post('convert-client')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async convertClientToEmployee(
    @Body() body: {
      memberId?: string;
      userId?: string;
      email?: string;
      role: EmployeeRole;
      salary?: number;
      specialization?: string;
      hireDate?: string;
    },
    @Request() req: any,
  ) {
    return this.employeeService.convertClientToEmployee(body, req.user);
  }
}
