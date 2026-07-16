import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Attendance, AttendanceStatus } from '../../entities/attendance.entity';
import { Member } from '../../entities/member.entity';
import { Employee } from '../../entities/employee.entity';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';
import { RegisterByCodeDto, RegisterByNameDto } from './dto/register-by-code.dto';

@Injectable()
export class AttendancesService {
  private readonly logger = new Logger(AttendancesService.name);

  // Mapeo de roles en inglés a español
  private readonly roleTranslations: { [key: string]: string } = {
    manager: 'Gerente',
    trainer: 'Entrenador',
    receptionist: 'Recepcionista',
    cleaner: 'Limpieza',
    nutritionist: 'Nutricionista',
    supervisor: 'Supervisor',
    cashier: 'Cajero',
    admin: 'Administrador',
    encargado: 'Encargado',
    empleado_cajero: 'Cajero',
    empleado_entrenador: 'Entrenador',
  };

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Employee)
    private employeeRepository: Repository<Employee>,
  ) {}

  private translateRole(role: string): string {
    return this.roleTranslations[role.toLowerCase()] || role;
  }

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    const attendanceType = createAttendanceDto.attendanceType || 'member';
    
    if (attendanceType === 'member') {
      console.log(`[AttendancesService] 📝 Registrando asistencia para miembro: ${createAttendanceDto.memberId}`);

      // Verificar que el miembro existe
      const member = await this.memberRepository.findOne({
        where: { id: createAttendanceDto.memberId },
      });

      if (!member) {
        throw new NotFoundException(`Miembro ${createAttendanceDto.memberId} no encontrado`);
      }

      // Crear registro de asistencia para miembro
      const attendanceData = {
        id: uuidv4(),
        memberId: createAttendanceDto.memberId,
        attendanceType: 'member' as const,
        visitDate: new Date(createAttendanceDto.visitDate),
        status: createAttendanceDto.status || AttendanceStatus.ACCEPTED,
        rejectionReason: createAttendanceDto.rejectionReason || undefined,
        notes: createAttendanceDto.notes || undefined,
      };

      const attendance = this.attendanceRepository.create(attendanceData);
      const savedAttendance = await this.attendanceRepository.save(attendance);
      console.log(`[AttendancesService] ✅ Asistencia de miembro registrada: ${savedAttendance.id}`);

      return savedAttendance;
    } else {
      // Empleado
      console.log(`[AttendancesService] 📝 Registrando asistencia para empleado: ${createAttendanceDto.employeeId}`);

      // Verificar que el empleado existe
      const employee = await this.employeeRepository.findOne({
        where: { id: createAttendanceDto.employeeId },
      });

      if (!employee) {
        throw new NotFoundException(`Empleado ${createAttendanceDto.employeeId} no encontrado`);
      }

      // Crear registro de asistencia para empleado
      const attendanceData = {
        id: uuidv4(),
        employeeId: createAttendanceDto.employeeId,
        attendanceType: 'employee' as const,
        visitDate: new Date(createAttendanceDto.visitDate),
        status: createAttendanceDto.status || AttendanceStatus.ACCEPTED,
        rejectionReason: createAttendanceDto.rejectionReason || undefined,
        notes: createAttendanceDto.notes || undefined,
      };

      const attendance = this.attendanceRepository.create(attendanceData);
      const savedAttendance = await this.attendanceRepository.save(attendance);
      console.log(`[AttendancesService] ✅ Asistencia de empleado registrada: ${savedAttendance.id}`);

      return savedAttendance;
    }
  }

  async findAllByMember(memberId: string, page: number = 1, limit: number = 50): Promise<{ data: any[]; total: number }> {
    console.log(`[AttendancesService] 🔍 Obteniendo asistencias del miembro: ${memberId}`);

    const [data, total] = await this.attendanceRepository.findAndCount({
      where: { memberId },
      relations: ['member', 'member.user'],
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Enriquecer datos con información del miembro
    const enrichedData = data.map(attendance => ({
      ...attendance,
      memberCode: attendance.member?.memberCode,
      memberName: attendance.member?.user?.firstName || 'Desconocido',
      memberLastName: attendance.member?.user?.lastName || '',
      employeeRole: null,
    }));

    console.log(`[AttendancesService] ✅ Se encontraron ${total} registros`);
    return { data: enrichedData, total };
  }

  async findAll(page: number = 1, limit: number = 50): Promise<{ data: any[]; total: number }> {
    console.log(`[AttendancesService] 🔍 Obteniendo todas las asistencias`);

    const [data, total] = await this.attendanceRepository.findAndCount({
      relations: ['member', 'member.user', 'employee'],
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Enriquecer datos con información del miembro o empleado
    const enrichedData = data.map(attendance => ({
      ...attendance,
      memberCode: attendance.member?.memberCode || null,
      memberName: attendance.member 
        ? (attendance.member?.user?.firstName || 'Desconocido')
        : (attendance.employee?.firstName || 'Desconocido'),
      memberLastName: attendance.member
        ? (attendance.member?.user?.lastName || '')
        : (attendance.employee?.lastName || ''),
      employeeRole: attendance.attendanceType === 'employee'
        ? this.translateRole(attendance.employee?.role || attendance.member?.user?.role || 'Empleado')
        : null,
    }));

    console.log(`[AttendancesService] ✅ Se encontraron ${total} registros`);
    return { data: enrichedData, total };
  }

  async findOne(id: string): Promise<Attendance> {
    console.log(`[AttendancesService] 🔍 Obteniendo asistencia: ${id}`);

    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['member'],
    });

    if (!attendance) {
      throw new NotFoundException(`Asistencia ${id} no encontrada`);
    }

    return attendance;
  }

  async update(id: string, updateAttendanceDto: UpdateAttendanceDto): Promise<Attendance> {
    console.log(`[AttendancesService] 🔄 Actualizando asistencia: ${id}`);

    const attendance = await this.findOne(id);

    if (updateAttendanceDto.visitDate) {
      attendance.visitDate = new Date(updateAttendanceDto.visitDate);
    }

    if (updateAttendanceDto.notes !== undefined) {
      attendance.notes = updateAttendanceDto.notes;
    }

    const updated = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia actualizada: ${id}`);

    return updated;
  }

  async delete(id: string): Promise<void> {
    console.log(`[AttendancesService] 🗑️ Eliminando asistencia: ${id}`);

    const attendance = await this.findOne(id);

    await this.attendanceRepository.remove(attendance);
    console.log(`[AttendancesService] ✅ Asistencia eliminada: ${id}`);
  }

  async getAttendanceSummary(memberId: string): Promise<{ totalVisits: number; lastVisit: Date | null }> {
    console.log(`[AttendancesService] 📊 Obteniendo resumen de asistencia para: ${memberId}`);

    const attendance = await this.attendanceRepository.findAndCount({
      where: { memberId },
    });

    const [, totalVisits] = attendance;

    const lastAttendance = await this.attendanceRepository.findOne({
      where: { memberId },
      order: { visitDate: 'DESC' },
    });

    const result = {
      totalVisits,
      lastVisit: lastAttendance?.visitDate || null,
    };

    console.log(`[AttendancesService] ✅ Resumen: ${totalVisits} visitas, última: ${result.lastVisit}`);
    return result;
  }

  async registerByCode(registerByCodeDto: RegisterByCodeDto): Promise<any> {
    console.log(`[AttendancesService] 🔐 Registrando asistencia por código: ${registerByCodeDto.memberCode}`);

    // Buscar miembro por código con relación user
    const member = await this.memberRepository.findOne({
      where: { memberCode: registerByCodeDto.memberCode },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException(`Miembro con código ${registerByCodeDto.memberCode} no encontrado`);
    }

    console.log(`[AttendancesService] ✅ Miembro encontrado: ${member.id}`);

    // Crear registro de asistencia con timestamp actual
    const attendanceData = {
      id: uuidv4(),
      memberId: member.id,
      visitDate: new Date(), // Timestamp actual
      status: AttendanceStatus.ACCEPTED,
      notes: registerByCodeDto.notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia registrada por código: ${savedAttendance.id}`);

    // Serializar la respuesta con los campos esperados por el cliente
    const serializedAttendance = {
      id: savedAttendance.id,
      memberId: savedAttendance.memberId,
      employeeId: savedAttendance.employeeId || null,
      attendanceType: savedAttendance.attendanceType || 'member',
      visitDate: savedAttendance.visitDate.toISOString(),
      notes: savedAttendance.notes || null,
      createdAt: savedAttendance.createdAt.toISOString(),
      status: savedAttendance.status,
      rejectionReason: savedAttendance.rejectionReason || null,
      memberCode: member.memberCode || null,
      memberName: member.user?.firstName || 'Desconocido',
      memberLastName: member.user?.lastName || '',
      employeeRole: null,
    };

    // Retornar respuesta amigable
    const response = {
      statusCode: 200,
      success: true,
      status: 'ACCEPTED',
      message: 'Acceso permitido',
      attendance: serializedAttendance,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[AttendancesService] 📤 Respuesta: ${JSON.stringify(response)}`);
    return response;
  }

  async registerByName(registerByNameDto: RegisterByNameDto): Promise<Attendance> {
    console.log(`[AttendancesService] 👤 Registrando asistencia por nombre: ${registerByNameDto.memberName}`);

    // Buscar miembro por nombre (usando relación con User)
    const member = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('user.firstName LIKE :firstName OR user.lastName LIKE :lastName', {
        firstName: `%${registerByNameDto.memberName}%`,
        lastName: `%${registerByNameDto.memberName}%`,
      })
      .getOne();

    if (!member) {
      throw new NotFoundException(`Miembro con nombre "${registerByNameDto.memberName}" no encontrado`);
    }

    console.log(`[AttendancesService] ✅ Miembro encontrado: ${member.id}`);

    // Crear registro de asistencia con timestamp actual
    const attendanceData = {
      id: uuidv4(),
      memberId: member.id,
      visitDate: new Date(), // Timestamp actual
      notes: registerByNameDto.notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia registrada por nombre: ${savedAttendance.id}`);

    return savedAttendance;
  }

  async registerRejectedAttendance(memberCode: string, rejectionReason: string): Promise<Attendance> {
    console.log(`[AttendancesService] ❌ Registrando intento rechazado para código: ${memberCode}`);

    // Buscar miembro por código
    const member = await this.memberRepository.findOne({
      where: { memberCode },
    });

    if (!member) {
      throw new NotFoundException(`Miembro con código ${memberCode} no encontrado`);
    }

    // Crear registro de asistencia rechazada
    const attendanceData = {
      id: uuidv4(),
      memberId: member.id,
      visitDate: new Date(),
      status: AttendanceStatus.REJECTED,
      rejectionReason,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ❌ Intento rechazado registrado: ${savedAttendance.id}`);

    return savedAttendance;
  }

  async registerById(memberId: string, notes?: string): Promise<any> {
    console.log(`[AttendancesService] 🔐 Registrando asistencia por ID: ${memberId}`);

    // Buscar miembro por ID con relación user
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    console.log(`[AttendancesService] ✅ Miembro encontrado: ${member.id}`);

    // Crear registro de asistencia con timestamp actual
    const attendanceData = {
      id: uuidv4(),
      memberId: member.id,
      visitDate: new Date(), // Timestamp actual
      status: AttendanceStatus.ACCEPTED,
      notes: notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia registrada por ID: ${savedAttendance.id}`);

    // Serializar la respuesta con los campos esperados por el cliente
    const serializedAttendance = {
      id: savedAttendance.id,
      memberId: savedAttendance.memberId,
      employeeId: savedAttendance.employeeId || null,
      attendanceType: savedAttendance.attendanceType || 'member',
      visitDate: savedAttendance.visitDate.toISOString(),
      notes: savedAttendance.notes || null,
      createdAt: savedAttendance.createdAt.toISOString(),
      status: savedAttendance.status,
      rejectionReason: savedAttendance.rejectionReason || null,
      memberCode: member.memberCode || null,
      memberName: member.user?.firstName || 'Desconocido',
      memberLastName: member.user?.lastName || '',
      employeeRole: null,
    };

    // Retornar respuesta amigable
    const response = {
      statusCode: 200,
      success: true,
      status: 'ACCEPTED',
      message: 'Acceso permitido',
      attendance: serializedAttendance,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[AttendancesService] 📤 Respuesta: ${JSON.stringify(response)}`);
    return response;
  }

  async registerRejectedAttendanceById(memberId: string, rejectionReason: string): Promise<Attendance> {
    console.log(`[AttendancesService] ❌ Registrando intento rechazado para ID: ${memberId}`);

    // Verificar que el miembro existe
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    // Crear registro de asistencia rechazada
    const attendanceData = {
      id: uuidv4(),
      memberId: member.id,
      visitDate: new Date(),
      status: AttendanceStatus.REJECTED,
      rejectionReason,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ❌ Intento rechazado registrado: ${savedAttendance.id}`);

    return savedAttendance;
  }

  async findAllByEmployee(employeeId: string, page: number = 1, limit: number = 50): Promise<{ data: any[]; total: number }> {
    console.log(`[AttendancesService] 🔍 Obteniendo asistencias del empleado: ${employeeId}`);

    const [data, total] = await this.attendanceRepository.findAndCount({
      where: { employeeId, attendanceType: 'employee' },
      relations: ['employee'],
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Enriquecer datos con información del empleado (usar nombres consistentes con memberName/memberLastName)
    const enrichedData = data.map(attendance => ({
      ...attendance,
      memberCode: null,
      memberName: attendance.employee?.firstName || 'Desconocido',
      memberLastName: attendance.employee?.lastName || '',
      employeeRole: this.translateRole(attendance.employee?.role || 'Empleado'),
      employeeName: attendance.employee?.firstName || 'Desconocido',
      employeeLastName: attendance.employee?.lastName || '',
    }));

    console.log(`[AttendancesService] ✅ Se encontraron ${total} registros de empleado`);
    return { data: enrichedData, total };
  }

  async getEmployeeAttendanceSummary(employeeId: string): Promise<{ totalVisits: number; lastVisit: Date | null }> {
    console.log(`[AttendancesService] 📊 Obteniendo resumen de asistencias del empleado: ${employeeId}`);

    const attendances = await this.attendanceRepository.find({
      where: { employeeId, attendanceType: 'employee' },
      order: { visitDate: 'DESC' },
    });

    const totalVisits = attendances.length;
    const lastVisit = attendances.length > 0 ? attendances[0].visitDate : null;

    return {
      totalVisits,
      lastVisit,
    };
  }

  async registerEmployeeById(employeeId: string, notes?: string): Promise<any> {
    console.log(`[AttendancesService] 👔 Registrando asistencia de empleado: ${employeeId}`);

    // Verificar que el empleado existe
    const employee = await this.employeeRepository.findOne({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException(`Empleado ${employeeId} no encontrado`);
    }

    // Crear registro de asistencia para empleado
    const attendanceData = {
      id: uuidv4(),
      employeeId: employeeId,
      attendanceType: 'employee' as const,
      visitDate: new Date(),
      status: AttendanceStatus.ACCEPTED,
      notes: notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia de empleado registrada: ${savedAttendance.id}`);

    // Serializar la respuesta con los campos esperados por el cliente
    const serializedAttendance = {
      id: savedAttendance.id,
      memberId: savedAttendance.memberId || null,
      employeeId: savedAttendance.employeeId,
      attendanceType: savedAttendance.attendanceType,
      visitDate: savedAttendance.visitDate.toISOString(),
      notes: savedAttendance.notes || null,
      createdAt: savedAttendance.createdAt.toISOString(),
      status: savedAttendance.status,
      rejectionReason: savedAttendance.rejectionReason || null,
      memberCode: null,
      memberName: employee.firstName || 'Empleado',
      memberLastName: employee.lastName || '',
      employeeRole: this.translateRole(employee.role || 'Empleado'),
    };

    return {
      statusCode: 200,
      success: true,
      status: 'ACCEPTED',
      message: `✅ Asistencia de ${employee.firstName} ${employee.lastName} registrada correctamente`,
      attendance: serializedAttendance,
      timestamp: new Date().toISOString(),
    };
  }
}
