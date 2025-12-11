import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';
import { RegisterByCodeDto } from './dto/register-by-code.dto';
import { Attendance } from '../../entities/attendance.entity';
import { UserRole } from '../../entities/user.entity';

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  private readonly logger = new Logger(AttendancesController.name);

  constructor(private attendancesService: AttendancesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async create(@Body() createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 📝 POST /api/attendances - Registrando asistencia`);
    return this.attendancesService.create(createAttendanceDto);
  }

  @Post('register-by-code')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async registerByCode(@Body() registerByCodeDto: RegisterByCodeDto): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 🔐 POST /api/attendances/register-by-code - Registrando asistencia por código`);
    return this.attendancesService.registerByCode(registerByCodeDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    this.logger.log(`[AttendancesController] 🔍 GET /api/attendances - Obteniendo todas las asistencias`);
    return this.attendancesService.findAll(page, limit);
  }

  @Get('member/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async findByMember(
    @Param('memberId') memberId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<{ data: Attendance[]; total: number }> {
    this.logger.log(`[AttendancesController] 🔍 GET /api/attendances/member/${memberId}`);
    return this.attendancesService.findAllByMember(memberId, page, limit);
  }

  @Get('summary/:memberId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAttendanceSummary(
    @Param('memberId') memberId: string,
  ): Promise<{ totalVisits: number; lastVisit: Date | null }> {
    this.logger.log(`[AttendancesController] 📊 GET /api/attendances/summary/${memberId}`);
    return this.attendancesService.getAttendanceSummary(memberId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async findOne(@Param('id') id: string): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 🔍 GET /api/attendances/${id}`);
    return this.attendancesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 🔄 PUT /api/attendances/${id}`);
    return this.attendancesService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async delete(@Param('id') id: string): Promise<void> {
    this.logger.log(`[AttendancesController] 🗑️ DELETE /api/attendances/${id}`);
    return this.attendancesService.delete(id);
  }
}
