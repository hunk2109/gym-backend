import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/member.entity';
import { MemberMembership } from '../entities/member-membership.entity';
import { UserRole } from '../entities/user.entity';

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export interface MembershipInfo {
  status: MembershipStatus;
  isExpired: boolean;
  daysUntilExpiry?: number;
  daysOverdue?: number;
  membershipName?: string;
  expiryDate?: Date;
}

@Injectable()
export class MembershipValidationService {
  private readonly logger = new Logger(MembershipValidationService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
  ) {}

  /**
   * Obtiene el estado de la membresía de un miembro
   */
  async getMembershipStatus(memberId: string): Promise<MembershipInfo> {
    try {
      // Obtener la membresía más reciente del miembro
      const membership = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.membership', 'membership')
        .where('mm.memberId = :memberId', { memberId })
        .orderBy('mm.endDate', 'DESC')
        .take(1)
        .getOne();

      if (!membership) {
        return {
          status: MembershipStatus.PENDING,
          isExpired: false,
          membershipName: 'Sin membresía',
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(membership.endDate);
      expiryDate.setHours(0, 0, 0, 0);

      // Calcular si está vencida
      const isExpired = expiryDate < today;

      if (isExpired) {
        const daysOverdue = Math.floor(
          (today.getTime() - expiryDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          status: MembershipStatus.EXPIRED,
          isExpired: true,
          daysOverdue,
          membershipName: membership.membership.name,
          expiryDate: membership.endDate,
        };
      }

      // Calcular días hasta vencimiento
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        status: MembershipStatus.ACTIVE,
        isExpired: false,
        daysUntilExpiry,
        membershipName: membership.membership.name,
        expiryDate: membership.endDate,
      };
    } catch (error) {
      this.logger.error(`Error al obtener estado de membresía: ${error.message}`);
      return {
        status: MembershipStatus.PENDING,
        isExpired: false,
      };
    }
  }

  /**
   * Actualiza si el miembro tiene membresía activa basado en validación
   */
  async updateMembershipStatus(memberId: string): Promise<void> {
    try {
      const membershipInfo = await this.getMembershipStatus(memberId);

      // El status de membresía se calcula dinámicamente desde member_memberships
      // No es necesario actualizar nada en la tabla members
      this.logger.log(
        `👤 Estado de membresía calculado para ${memberId}: ${membershipInfo.status}`
      );
    } catch (error) {
      this.logger.error(
        `Error al obtener estado del miembro: ${error.message}`
      );
    }
  }

  /**
   * Obtiene todos los miembros con membresía vencida
   */
  async getExpiredMembers(): Promise<
    Array<{ member: Member; daysOverdue: number }>
  > {
    try {
      const expiredMembers = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .innerJoin(
          (qb) =>
            qb
              .select('mms.memberId', 'memberId')
              .addSelect('MAX(mms.endDate)', 'maxEndDate')
              .from('member_memberships', 'mms')
              .groupBy('mms.memberId'),
          'latest',
          'latest.memberId = mm.memberId AND latest.maxEndDate = mm.endDate'
        )
        .where('DATE(mm.endDate) < CURDATE()')
        .andWhere('(user.role != :adminRole OR user.role IS NULL)', { adminRole: UserRole.ADMIN })
        .orderBy('mm.endDate', 'ASC')
        .getMany();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return expiredMembers.map((mm) => ({
        member: mm.member,
        daysOverdue: Math.floor(
          (today.getTime() - new Date(mm.endDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }));
    } catch (error) {
      this.logger.error(`Error al obtener miembros vencidos: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtiene todos los miembros con membresía próxima a vencer
   */
  async getExpiringMembersInDays(days: number = 7): Promise<
    Array<{ member: Member; daysLeft: number }>
  > {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const expiringMembers = await this.memberMembershipRepository
        .createQueryBuilder('mm')
        .leftJoinAndSelect('mm.member', 'member')
        .leftJoinAndSelect('member.user', 'user')
        .innerJoin(
          (qb) =>
            qb
              .select('mms.memberId', 'memberId')
              .addSelect('MAX(mms.endDate)', 'maxEndDate')
              .from('member_memberships', 'mms')
              .groupBy('mms.memberId'),
          'latest',
          'latest.memberId = mm.memberId AND latest.maxEndDate = mm.endDate'
        )
        .where('mm.endDate > NOW()')
        .andWhere('mm.endDate <= :futureDate', { futureDate })
        .andWhere('(user.role != :adminRole OR user.role IS NULL)', { adminRole: UserRole.ADMIN })
        .orderBy('mm.endDate', 'ASC')
        .getMany();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return expiringMembers.map((mm) => ({
        member: mm.member,
        daysLeft: Math.ceil(
          (new Date(mm.endDate).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      }));
    } catch (error) {
      this.logger.error(
        `Error al obtener miembros próximos a vencer: ${error.message}`
      );
      return [];
    }
  }
}
