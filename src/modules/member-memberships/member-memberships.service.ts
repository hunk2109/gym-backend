import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { CreateMemberMembershipDto } from './dto/create-member-membership.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MemberMembershipsService {
  constructor(
    @InjectRepository(MemberMembership)
    private readonly memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
  ) {}

  /**
   * Obtener la membresía activa de un miembro
   */
  async getMemberActiveMembership(memberId: string): Promise<MemberMembership | null> {
    console.log(`[DEBUG getMemberActiveMembership] Buscando membresía para memberId: ${memberId}`);
    
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
        isActive: true,
      },
      relations: ['membership', 'member'],
      order: {
        createdAt: 'DESC',
      },
    });

    console.log(`[DEBUG getMemberActiveMembership] Membresía activa encontrada: ${memberMembership ? 'SÍ' : 'NO'}`);
    if (memberMembership) {
      console.log(`[DEBUG getMemberActiveMembership] memberMembership: ${JSON.stringify(memberMembership)}`);
    }

    if (!memberMembership) {
      console.log(`[DEBUG getMemberActiveMembership] No hay activa, buscando la más reciente...`);
      // Si no hay membresía activa, buscar la más reciente sin importar estado
      const recentMembership = await this.memberMembershipRepository.findOne({
        where: {
          memberId,
        },
        relations: ['membership', 'member'],
        order: {
          createdAt: 'DESC',
        },
      });

      console.log(`[DEBUG getMemberActiveMembership] Membresía reciente encontrada: ${recentMembership ? 'SÍ' : 'NO'}`);
      if (recentMembership) {
        console.log(`[DEBUG getMemberActiveMembership] recentMembership: ${JSON.stringify(recentMembership)}`);
        console.log(`[DEBUG getMemberActiveMembership] recentMembership.membership: ${JSON.stringify(recentMembership.membership)}`);
      }

      if (!recentMembership) {
        console.log(`[DEBUG getMemberActiveMembership] Devolviendo null - NO hay membresías`);
        return null;
      }

      // Devolver el objeto directamente SIN desparramarlo para preservar las relaciones
      console.log(`[DEBUG getMemberActiveMembership] Devolviendo reciente con membership embebido`);
      return recentMembership;
    }

    // Retornar el objeto directamente SIN desparramarlo para preservar las relaciones
    console.log(`[DEBUG getMemberActiveMembership] Devolviendo activa con membership embebido`);
    return memberMembership;
  }

  /**
   * Obtener todas las membresías de un miembro
   */
  async getMemberMembershipsHistory(memberId: string): Promise<MemberMembership[]> {
    const memberExists = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!memberExists) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    return this.memberMembershipRepository.find({
      where: { memberId },
      relations: ['membership'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Asignar una membresía a un miembro
   */
  async assignMembership(
    memberId: string,
    dto: CreateMemberMembershipDto,
  ): Promise<MemberMembership> {
    // Verificar que el miembro existe
    const member = await this.memberRepository.findOne({
      where: { id: memberId },
    });

    if (!member) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado`);
    }

    // Verificar que la membresía existe
    const membership = await this.membershipRepository.findOne({
      where: { id: dto.membershipId },
    });

    if (!membership) {
      throw new NotFoundException(
        `Membresía con ID ${dto.membershipId} no encontrada`,
      );
    }

    // Validar fechas
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    // Desactivar membresías previas activas
    await this.memberMembershipRepository.update(
      { memberId, isActive: true },
      { isActive: false },
    );

    // Crear nueva membresía (sin usar .create para evitar problemas con TypeORM)
    const memberMembership = new MemberMembership();
    memberMembership.id = uuidv4();
    memberMembership.memberId = memberId;
    memberMembership.membershipId = dto.membershipId;
    memberMembership.startDate = startDate;
    memberMembership.endDate = endDate;
    memberMembership.isActive = true;
    memberMembership.amountPaid = (dto.amountPaid ?? null) as any;
    memberMembership.paymentDate = (dto.paymentDate ?? null) as any;
    memberMembership.paymentStatus = dto.amountPaid ? 'paid' : 'pending';
    memberMembership.isRecurring = false;

    // Actualizar el miembro para indicar que tiene membresía
    await this.memberRepository.update(
      { id: memberId },
      { hasMembership: true } as any,
    );

    return this.memberMembershipRepository.save(memberMembership);
  }

  /**
   * Remover la membresía activa de un miembro
   */
  async removeMembership(memberId: string): Promise<void> {
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId,
        isActive: true,
      },
    });

    if (!memberMembership) {
      throw new NotFoundException(
        `No se encontró membresía activa para el miembro ${memberId}`,
      );
    }

    // Desactivar la membresía
    await this.memberMembershipRepository.update(
      { id: memberMembership.id },
      { isActive: false },
    );

    // Actualizar el miembro para indicar que NO tiene membresía activa
    await this.memberRepository.update(
      { id: memberId },
      { hasMembership: false } as any,
    );
  }

  /**
   * Obtener todas las membresías pendientes de pago
   */
  async getPendingPayments(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      where: {
        isActive: true,
        paymentStatus: 'pending',
      },
      relations: ['membership', 'member'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Registrar un pago para una membresía
   */
  async recordPayment(
    memberMembershipId: string,
    amountPaid: number,
    paymentDate: Date = new Date(),
  ): Promise<MemberMembership> {
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: { id: memberMembershipId },
    });

    if (!memberMembership) {
      throw new NotFoundException(
        `MemberMembership con ID ${memberMembershipId} no encontrado`,
      );
    }

    memberMembership.amountPaid = amountPaid;
    memberMembership.paymentDate = paymentDate;
    memberMembership.paymentStatus = 'paid';

    return this.memberMembershipRepository.save(memberMembership);
  }

  /**
   * Obtener todas las membresías de los miembros (paginadas)
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      relations: ['membership', 'member'],
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
