import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Attendance } from '../../entities/attendance.entity';
import { Member } from '../../entities/member.entity';
import { CreateAttendanceDto, UpdateAttendanceDto } from './dto/create-attendance.dto';
import { RegisterByCodeDto, RegisterByNameDto } from './dto/register-by-code.dto';

@Injectable()
export class AttendancesService {
  private readonly logger = new Logger(AttendancesService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    console.log(`[AttendancesService] 📝 Registrando asistencia para memberId: ${createAttendanceDto.memberId}`);

    // Verificar que el miembro existe
    const member = await this.memberRepository.findOne({
      where: { id: createAttendanceDto.memberId },
    });

    if (!member) {
      throw new NotFoundException(`Miembro ${createAttendanceDto.memberId} no encontrado`);
    }

    // Crear registro de asistencia
    const attendanceData = {
      id: uuidv4(),
      memberId: createAttendanceDto.memberId,
      visitDate: new Date(createAttendanceDto.visitDate),
      notes: createAttendanceDto.notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia registrada: ${savedAttendance.id}`);

    return savedAttendance;
  }

  async findAllByMember(memberId: string, page: number = 1, limit: number = 50): Promise<{ data: Attendance[]; total: number }> {
    console.log(`[AttendancesService] 🔍 Obteniendo asistencias del miembro: ${memberId}`);

    const [data, total] = await this.attendanceRepository.findAndCount({
      where: { memberId },
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(`[AttendancesService] ✅ Se encontraron ${total} registros`);
    return { data, total };
  }

  async findAll(page: number = 1, limit: number = 50): Promise<{ data: Attendance[]; total: number }> {
    console.log(`[AttendancesService] 🔍 Obteniendo todas las asistencias`);

    const [data, total] = await this.attendanceRepository.findAndCount({
      relations: ['member'],
      order: { visitDate: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    console.log(`[AttendancesService] ✅ Se encontraron ${total} registros`);
    return { data, total };
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

  async registerByCode(registerByCodeDto: RegisterByCodeDto): Promise<Attendance> {
    console.log(`[AttendancesService] 🔐 Registrando asistencia por código: ${registerByCodeDto.memberCode}`);

    // Buscar miembro por código
    const member = await this.memberRepository.findOne({
      where: { memberCode: registerByCodeDto.memberCode },
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
      notes: registerByCodeDto.notes || undefined,
    };

    const attendance = this.attendanceRepository.create(attendanceData);
    const savedAttendance = await this.attendanceRepository.save(attendance);
    console.log(`[AttendancesService] ✅ Asistencia registrada por código: ${savedAttendance.id}`);

    return savedAttendance;
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
}
