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
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttendancesService } from './attendances.service';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';
import { RegisterByCodeDto, RegisterByNameDto } from './dto/register-by-code.dto';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Member } from '../../entities/member.entity';
import { UserRole } from '../../entities/user.entity';
import { MembershipAccessScheduleService } from '../memberships/membership-access-schedule.service';

@Controller('attendances')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendancesController {
  private readonly logger = new Logger(AttendancesController.name);

  constructor(
    private attendancesService: AttendancesService,
    private accessScheduleService: MembershipAccessScheduleService,
    @InjectRepository(Member) private memberRepository: Repository<Member>,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async create(@Body() createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 📝 POST /api/attendances - Registrando asistencia`);
    return this.attendancesService.create(createAttendanceDto);
  }

  @Post('register-by-code')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async registerByCode(@Body() registerByCodeDto: RegisterByCodeDto): Promise<any> {
    this.logger.log(`[AttendancesController] 🔐 POST /api/attendances/register-by-code - Registrando asistencia por código`);
    
    // Validar horario de acceso
    const validation = await this.accessScheduleService.validateMemberAccessBySchedule(
      registerByCodeDto.memberCode,
    );

    if (!validation.allowed) {
      const reason = validation.reason || 'Access denied';
      this.logger.warn(`[AttendancesController] Acceso rechazado: ${reason}`);
      
      // Cargar información del miembro
      const member = await this.memberRepository.findOne({
        where: { memberCode: registerByCodeDto.memberCode },
        relations: ['user'],
      });
      
      // Registrar intento rechazado
      const rejectedAttendance = await this.attendancesService.registerRejectedAttendance(
        registerByCodeDto.memberCode,
        reason,
      );
      
      // Retornar respuesta amigable en lugar de error
      return {
        statusCode: 200,
        success: false,
        status: 'REJECTED',
        message: this._getFriendlyMessage(reason),
        reason: reason,
        memberCode: registerByCodeDto.memberCode,
        memberName: member?.user?.firstName || 'Desconocido',
        memberLastName: member?.user?.lastName || '',
        attendance: rejectedAttendance,
        timestamp: new Date().toISOString(),
      };
    }

    return this.attendancesService.registerByCode(registerByCodeDto);
  }

  @Post('register-by-id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async registerById(@Body() body: { memberId: string; notes?: string }): Promise<any> {
    this.logger.log(`[AttendancesController] 🔐 POST /api/attendances/register-by-id - Registrando asistencia por ID`);
    
    // Validar horario de acceso usando el ID
    const validation = await this.accessScheduleService.validateMemberAccessByScheduleId(
      body.memberId,
    );

    if (!validation.allowed) {
      const reason = validation.reason || 'Access denied';
      this.logger.warn(`[AttendancesController] Acceso rechazado: ${reason}`);
      
      // Cargar información del miembro
      const member = await this.memberRepository.findOne({
        where: { id: body.memberId },
        relations: ['user'],
      });
      
      // Registrar intento rechazado
      const rejectedAttendance = await this.attendancesService.registerRejectedAttendanceById(
        body.memberId,
        reason,
      );
      
      // Retornar respuesta amigable en lugar de error
      return {
        statusCode: 200,
        success: false,
        status: 'REJECTED',
        message: this._getFriendlyMessage(reason),
        reason: reason,
        memberId: body.memberId,
        memberName: member?.user?.firstName || 'Desconocido',
        memberLastName: member?.user?.lastName || '',
        attendance: rejectedAttendance,
        timestamp: new Date().toISOString(),
      };
    }

    return this.attendancesService.registerById(body.memberId, body.notes);
  }

  @Post('register-employee')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async registerEmployeeAttendance(@Body() body: { employeeId: string; notes?: string }): Promise<any> {
    this.logger.log(`[AttendancesController] 👔 POST /api/attendances/register-employee - Registrando asistencia de empleado`);
    return this.attendancesService.registerEmployeeById(body.employeeId, body.notes);
  }

  private _getFriendlyMessage(reason: string): string {
    const messages: { [key: string]: string } = {
      'Payment pending or suspended': '⚠️ El pago de la membresía está pendiente o suspendido. Por favor, contacta con administración.',
      'Member not found': '❌ Miembro no encontrado. Verifica el código.',
      'No active membership': '❌ El miembro no tiene una membresía activa.',
      'Membership expired': '⏰ La membresía ha expirado. Debe renovarse para continuar.',
      'Access outside schedule hours': '🕐 El acceso está restringido por horario. Tu membresía solo permite acceso en horarios específicos.',
      'Schedule not configured for this day': '📅 No hay horarios configurados para hoy.',
      'Access denied': '❌ Acceso denegado.',
    };
    
    return messages[reason] || `❌ Acceso denegado: ${reason}`;
  }

  @Post('register-by-name')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async registerByName(@Body() registerByNameDto: RegisterByNameDto): Promise<Attendance> {
    this.logger.log(`[AttendancesController] 👤 POST /api/attendances/register-by-name - Registrando asistencia por nombre`);
    return this.attendancesService.registerByName(registerByNameDto);
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

  // Endpoints para empleados
  @Get('employee/:employeeId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
  ): Promise<any> {
    this.logger.log(`[AttendancesController] 🔍 GET /api/attendances/employee/${employeeId}`);
    return this.attendancesService.findAllByEmployee(employeeId, page, limit);
  }

  @Get('employee/:employeeId/summary')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getEmployeeSummary(@Param('employeeId') employeeId: string): Promise<any> {
    this.logger.log(`[AttendancesController] 📊 GET /api/attendances/employee/${employeeId}/summary`);
    return this.attendancesService.getEmployeeAttendanceSummary(employeeId);
  }
}
