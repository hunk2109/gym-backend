import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Group } from '../../entities/group.entity';
import { GroupCompanion } from '../../entities/group-companion.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private groupRepository: Repository<Group>,
    @InjectRepository(GroupCompanion)
    private groupCompanionRepository: Repository<GroupCompanion>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
  ) {}

  async createGroup(
    name: string,
    membershipId: string,
    responsibleMemberId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Group> {
    // Validar membresía existe y es de tipo 'group'
    const membership = await this.membershipRepository.findOne({
      where: { id: membershipId },
    });
    if (!membership) {
      throw new NotFoundException('Membresía no encontrada');
    }
    if (membership.type !== 'group') {
      throw new BadRequestException('La membresía debe ser de tipo grupal');
    }

    // Validar miembro responsable existe
    const responsibleMember = await this.memberRepository.findOne({
      where: { id: responsibleMemberId },
    });
    if (!responsibleMember) {
      throw new NotFoundException('Miembro responsable no encontrado');
    }

    // Crear grupo
    const group = new Group();
    group.id = uuidv4();
    group.name = name;
    group.membershipId = membershipId;
    group.membership = membership;
    group.responsibleMemberId = responsibleMemberId;
    group.responsibleMember = responsibleMember;
    group.startDate = startDate;
    group.endDate = endDate;
    group.status = 'active';
    group.companionCount = 0;
    group.companions = [];

    return await this.groupRepository.save(group);
  }

  async getGroupById(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['membership', 'responsibleMember', 'companions', 'companions.member'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return group;
  }

  async getGroupsByMemberId(memberId: string): Promise<Group[]> {
    // Obtener grupos donde es responsable
    const responsibleGroups = await this.groupRepository.find({
      where: { responsibleMemberId: memberId },
      relations: ['membership', 'responsibleMember', 'companions', 'companions.member'],
    });

    // Obtener grupos donde es acompañante
    const companionGroups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect(
        'group.companions',
        'companion',
        'companion.memberId = :memberId',
        { memberId },
      )
      .leftJoinAndSelect('group.membership', 'membership')
      .leftJoinAndSelect('group.responsibleMember', 'responsibleMember')
      .where('companion.memberId = :memberId', { memberId })
      .getMany();

    // Combinar y eliminar duplicados
    const allGroups = [...responsibleGroups, ...companionGroups];
    return Array.from(new Map(allGroups.map((g) => [g.id, g])).values());
  }

  async updateGroup(
    groupId: string,
    name?: string,
    description?: string,
    status?: string,
  ): Promise<Group> {
    const group = await this.getGroupById(groupId);

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (status && ['active', 'suspended', 'expired'].includes(status)) {
      group.status = status as 'active' | 'suspended' | 'expired';
    }

    return await this.groupRepository.save(group);
  }

  async deleteGroup(groupId: string, requestingMemberId: string): Promise<void> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable puede eliminar
    if (group.responsibleMemberId !== requestingMemberId) {
      throw new BadRequestException(
        'Solo el responsable del grupo puede eliminarlo',
      );
    }

    await this.groupRepository.remove(group);
  }

  async addCompanionToGroup(
    groupId: string,
    memberId: string,
    relationship: string,
    requestingMemberId: string,
  ): Promise<GroupCompanion> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable puede agregar acompañantes
    if (group.responsibleMemberId !== requestingMemberId) {
      throw new BadRequestException(
        'Solo el responsable del grupo puede agregar acompañantes',
      );
    }

    // Validar que el miembro existe
    const companion = await this.memberRepository.findOne({
      where: { id: memberId },
    });
    if (!companion) {
      throw new NotFoundException('Miembro acompañante no encontrado');
    }

    // Validar máximo de acompañantes
    if (
      group.membership.maxGroupCompanions &&
      group.companionCount >= group.membership.maxGroupCompanions
    ) {
      throw new BadRequestException(
        `Se ha alcanzado el máximo de acompañantes (${group.membership.maxGroupCompanions})`,
      );
    }

    // Validar que el miembro no sea ya acompañante de otro grupo
    const existingCompanion = await this.groupCompanionRepository.findOne({
      where: { memberId },
    });
    if (existingCompanion) {
      throw new BadRequestException(
        'Este miembro ya es acompañante de otro grupo',
      );
    }

    // Crear acompañante
    const newCompanion = new GroupCompanion();
    newCompanion.id = uuidv4();
    newCompanion.groupId = groupId;
    newCompanion.group = group;
    newCompanion.memberId = memberId;
    newCompanion.member = companion;
    newCompanion.relationship = relationship || '';
    newCompanion.status = 'active';

    await this.groupCompanionRepository.save(newCompanion);

    // Incrementar contador de acompañantes
    group.companionCount += 1;
    await this.groupRepository.save(group);

    return newCompanion;
  }

  async removeCompanionFromGroup(
    groupId: string,
    companionId: string,
    requestingMemberId: string,
  ): Promise<void> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable puede remover acompañantes
    if (group.responsibleMemberId !== requestingMemberId) {
      throw new BadRequestException(
        'Solo el responsable del grupo puede remover acompañantes',
      );
    }

    const companion = await this.groupCompanionRepository.findOne({
      where: { id: companionId },
    });

    if (!companion) {
      throw new NotFoundException('Acompañante no encontrado');
    }

    if (companion.groupId !== groupId) {
      throw new BadRequestException(
        'El acompañante no pertenece a este grupo',
      );
    }

    // Eliminar la membresía del acompañante
    await this.memberMembershipRepository.delete({
      memberId: companion.memberId,
      groupId: groupId,
      membershipType: 'companion',
    });

    // Eliminar acompañante
    await this.groupCompanionRepository.remove(companion);

    // Decrementar contador
    group.companionCount = Math.max(0, group.companionCount - 1);
    await this.groupRepository.save(group);
  }

  async transferResponsibility(
    groupId: string,
    newResponsibleMemberId: string,
    requestingMemberId: string,
  ): Promise<Group> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable actual puede transferir
    if (group.responsibleMemberId !== requestingMemberId) {
      throw new BadRequestException(
        'Solo el responsable actual puede transferir la responsabilidad',
      );
    }

    // Validar que el nuevo responsable es acompañante del grupo
    const companion = await this.groupCompanionRepository.findOne({
      where: { groupId, memberId: newResponsibleMemberId },
    });

    if (!companion) {
      throw new BadRequestException(
        'El nuevo responsable debe ser un acompañante del grupo',
      );
    }

    // Cambiar membresía del antiguo responsable a 'companion'
    const oldResponsibleMembership = await this.memberMembershipRepository.findOne(
      {
        where: {
          memberId: group.responsibleMemberId,
          groupId: groupId,
          membershipType: 'responsible',
        },
      },
    );

    if (oldResponsibleMembership) {
      oldResponsibleMembership.membershipType = 'companion';
      await this.memberMembershipRepository.save(oldResponsibleMembership);
    }

    // Cambiar membresía del nuevo responsable a 'responsible'
    const newResponsibleMembership = await this.memberMembershipRepository.findOne(
      {
        where: {
          memberId: newResponsibleMemberId,
          groupId: groupId,
          membershipType: 'companion',
        },
      },
    );

    if (newResponsibleMembership) {
      newResponsibleMembership.membershipType = 'responsible' as const;
      await this.memberMembershipRepository.save(newResponsibleMembership);
    }

    // Actualizar grupo
    group.responsibleMemberId = newResponsibleMemberId;
    return await this.groupRepository.save(group);
  }
}
