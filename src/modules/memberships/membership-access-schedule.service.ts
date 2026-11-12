import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MembershipAccessSchedule, DayOfWeek } from '../../entities/membership-access-schedule.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { GymSettingsService } from '../gym-settings/gym-settings.service';
import {
  CreateMembershipAccessScheduleDto,
  UpdateMembershipAccessScheduleDto,
} from './dto/membership-access-schedule.dto';

@Injectable()
export class MembershipAccessScheduleService {
  private readonly logger = new Logger(MembershipAccessScheduleService.name);

  constructor(
    @InjectRepository(MembershipAccessSchedule)
    private scheduleRepository: Repository<MembershipAccessSchedule>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private gymSettingsService: GymSettingsService,
  ) { }

  /**
   * Crear un nuevo horario de acceso para una membresía
   */
  async createSchedule(dto: CreateMembershipAccessScheduleDto): Promise<MembershipAccessSchedule> {
    this.logger.log(`[AccessSchedule] Creando horario para membresía ${dto.membershipId}`);

    // Verificar que la membresía exista
    const membership = await this.membershipRepository.findOne({
      where: { id: dto.membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Validar que timeEnd > timeStart
    if (dto.timeEnd <= dto.timeStart) {
      throw new BadRequestException('timeEnd debe ser mayor que timeStart');
    }

    // Verificar que no exista ya un horario para ese día
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        membershipId: dto.membershipId,
        dayOfWeek: dto.dayOfWeek,
      },
    });

    if (existingSchedule) {
      throw new BadRequestException(
        `Ya existe un horario para ${this.getDayNameInSpanish(dto.dayOfWeek as DayOfWeek)} en esta membresía`,
      );
    }

    const schedule = this.scheduleRepository.create({
      id: uuidv4(),
      membershipId: dto.membershipId,
      dayOfWeek: dto.dayOfWeek,
      timeStart: dto.timeStart,
      timeEnd: dto.timeEnd,
    });

    return this.scheduleRepository.save(schedule);
  }

  /**
   * Obtener todos los horarios de una membresía
   */
  async getSchedulesByMembership(membershipId: string): Promise<MembershipAccessSchedule[]> {
    this.logger.log(`[AccessSchedule] Obteniendo horarios para membresía ${membershipId}`);

    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.scheduleRepository.find({
      where: { membershipId },
      order: { dayOfWeek: 'ASC' },
    });
  }

  /**
   * Actualizar un horario de acceso
   */
  async updateSchedule(
    scheduleId: string,
    dto: UpdateMembershipAccessScheduleDto,
  ): Promise<MembershipAccessSchedule> {
    this.logger.log(`[AccessSchedule] Actualizando horario ${scheduleId}`);

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Validar que timeEnd > timeStart si ambos se proporcionan
    const timeStart = dto.timeStart || schedule.timeStart;
    const timeEnd = dto.timeEnd || schedule.timeEnd;

    if (timeEnd <= timeStart) {
      throw new BadRequestException('timeEnd debe ser mayor que timeStart');
    }

    Object.assign(schedule, dto);
    return this.scheduleRepository.save(schedule);
  }

  /**
   * Eliminar un horario de acceso
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    this.logger.log(`[AccessSchedule] Eliminando horario ${scheduleId}`);

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.scheduleRepository.remove(schedule);
  }

  /**
   * Busca un socio de forma flexible por ID, código exacto, número secuencial (125 -> MEM-000125 / MEM_000125),
   * zkUid o documento de identidad (cédula).
   */
  private async findMemberByIdentifier(identifier: string): Promise<Member | null> {
    const raw = (identifier || '').trim();
    if (!raw) return null;

    // 1. Búsqueda directa por id, memberCode o documentId
    let member = await this.memberRepository.findOne({
      where: [
        { id: raw },
        { memberCode: raw },
        { documentId: raw },
      ],
      relations: ['user'],
    });
    if (member) return member;

    // 2. Normalizar si ingresaron solo dígitos o formato MEM-xxx / MEM_xxx
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    if (digitsOnly) {
      const padded = digitsOnly.padStart(6, '0');
      const unpadded = String(parseInt(digitsOnly, 10));
      const numericUid = Number(digitsOnly);
      const conditions: any[] = [
        { memberCode: unpadded },
        { memberCode: digitsOnly },
        { memberCode: `MEM-${padded}` },
        { memberCode: `MEM_${padded}` },
        { documentId: digitsOnly },
      ];
      if (Number.isFinite(numericUid) && numericUid > 0) {
        conditions.push({ zkUid: numericUid });
      }
      member = await this.memberRepository.findOne({
        where: conditions,
        relations: ['user'],
      });
    }

    return member;
  }

  /**
   * Validar si un miembro tiene acceso en este momento
   * Retorna { allowed: boolean, reason?: string, membership?: Membership, member?: Member }
   */
  async validateMemberAccessBySchedule(
    memberIdentifier: string,
  ): Promise<{ allowed: boolean; reason?: string; membership?: Membership; member?: Member }> {
    this.logger.log(`[AccessSchedule] Validando acceso para miembro ${memberIdentifier}`);

    const member = await this.findMemberByIdentifier(memberIdentifier);

    if (!member) {
      return { allowed: false, reason: 'Miembro no encontrado' };
    }

    return this.validateResolvedMemberAccess(member);
  }

  private async validateResolvedMemberAccess(
    member: Member,
  ): Promise<{ allowed: boolean; reason?: string; membership?: Membership; member?: Member }> {
    // Obtener la membresía activa más reciente del miembro
    const activeMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId: member.id,
        isActive: true,
      },
      relations: ['membership'],
      order: { endDate: 'DESC' },
    });

    if (!activeMembership) {
      return { allowed: false, reason: 'Sin membresía asignada', member };
    }

    if (activeMembership.suspensionDate) {
      return {
        allowed: false,
        reason: 'Payment pending or suspended',
        membership: activeMembership.membership,
        member,
      };
    }

    // Verificar que la membresía no esté vencida (incluyendo días de gracia si no es pase diario)
    let graceDays = 0;
    try {
      const isDaily = Boolean(
        activeMembership.membership?.durationDays &&
        Number(activeMembership.membership.durationDays) > 0,
      );
      if (!isDaily) {
        const settings = await this.gymSettingsService.getSettings();
        graceDays = Number(settings?.membershipSuspensionDays || 0);
      }
    } catch {
      graceDays = 0;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const effectiveEndDate = new Date(activeMembership.endDate);
    effectiveEndDate.setDate(effectiveEndDate.getDate() + graceDays);
    const endStr = `${effectiveEndDate.getFullYear()}-${pad(effectiveEndDate.getMonth() + 1)}-${pad(effectiveEndDate.getDate())}`;

    if (endStr < todayStr) {
      return {
        allowed: false,
        reason: 'Membresía vencida',
        membership: activeMembership.membership,
        member,
      };
    }

    // Obtener el horario de la membresía
    const membership = await this.membershipRepository.findOne({
      where: { id: activeMembership.membershipId },
      relations: ['accessSchedules'],
    });

    if (!membership) {
      return {
        allowed: false,
        reason: 'Membresía no encontrada',
        member,
      };
    }

    // Si la membresía no tiene horarios específicos configurados, se asume acceso libre/completo
    if (!membership.accessSchedules || membership.accessSchedules.length === 0) {
      return {
        allowed: true,
        membership,
        member,
      };
    }

    // Obtener día actual
    const currentDate = new Date();
    const dayOfWeek = this.getDayOfWeek(currentDate);
    const currentTime = this.getCurrentTimeString(currentDate);

    // Buscar si hay horario para hoy
    const todaySchedule = membership.accessSchedules.find(
      (s) => s.dayOfWeek === dayOfWeek,
    );

    if (!todaySchedule) {
      return {
        allowed: false,
        reason: `Gimnasio cerrado el ${this.getDayNameInSpanish(dayOfWeek)}`,
        membership,
        member,
      };
    }

    // Verificar que el día esté habilitado
    if (todaySchedule.isEnabled === false) {
      return {
        allowed: false,
        reason: `Acceso deshabilitado el ${this.getDayNameInSpanish(dayOfWeek)}`,
        membership,
        member,
      };
    }

    // Validar que la hora actual esté dentro del rango
    if (currentTime < todaySchedule.timeStart || currentTime > todaySchedule.timeEnd) {
      return {
        allowed: false,
        reason: `Fuera de horarios permitidos (${todaySchedule.timeStart} - ${todaySchedule.timeEnd})`,
        membership,
        member,
      };
    }

    return { allowed: true, membership, member };
  }

  /**
   * Obtener el día de la semana en inglés basado en la fecha
   */
  private getDayOfWeek(date: Date): DayOfWeek {
    const days = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[date.getDay()];
  }

  /**
   * Obtener la hora actual en formato HH:mm:ss
   */
  private getCurrentTimeString(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Traducir día de la semana del inglés al español
   */
  private getDayNameInSpanish(dayOfWeek: DayOfWeek): string {
    const dayTranslations: Record<DayOfWeek, string> = {
      [DayOfWeek.MONDAY]: 'lunes',
      [DayOfWeek.TUESDAY]: 'martes',
      [DayOfWeek.WEDNESDAY]: 'miércoles',
      [DayOfWeek.THURSDAY]: 'jueves',
      [DayOfWeek.FRIDAY]: 'viernes',
      [DayOfWeek.SATURDAY]: 'sábado',
      [DayOfWeek.SUNDAY]: 'domingo',
    };
    return dayTranslations[dayOfWeek] || dayOfWeek;
  }

  async validateMemberAccessByScheduleId(
    memberId: string,
  ): Promise<{ allowed: boolean; reason?: string; membership?: Membership; member?: Member }> {
    this.logger.log(`[AccessSchedule] Validando acceso por ID para miembro ${memberId}`);

    const member = await this.memberRepository.findOne({
      where: { id: memberId },
      relations: ['user'],
    });

    if (!member) {
      return { allowed: false, reason: 'Miembro no encontrado' };
    }

    return this.validateResolvedMemberAccess(member);
  }
}
