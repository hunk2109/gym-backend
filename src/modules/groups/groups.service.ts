import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Group } from '../../entities/group.entity';
import { GroupCompanion } from '../../entities/group-companion.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { User } from '../../entities/user.entity';

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
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createGroup(
    name: string,
    membershipId: string,
    responsibleUserId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Group> {
    console.log(`[GroupsService.createGroup] 📋 Parámetros recibidos:`);
    console.log(`  - name: ${name} (${typeof name})`);
    console.log(`  - membershipId: ${membershipId} (${typeof membershipId})`);
    console.log(`  - responsibleUserId: ${responsibleUserId} (${typeof responsibleUserId})`);
    console.log(`  - startDate: ${startDate} (${typeof startDate}, instanceof Date: ${startDate instanceof Date})`);
    console.log(`  - endDate: ${endDate} (${typeof endDate}, instanceof Date: ${endDate instanceof Date})`);

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

    // Validar usuario responsable existe
    const responsibleUser = await this.userRepository.findOne({
      where: { id: responsibleUserId },
    });
    if (!responsibleUser) {
      throw new NotFoundException('Usuario responsable no encontrado');
    }

    // Crear grupo
    const group = new Group();
    group.id = uuidv4();
    group.name = name;
    group.membershipId = membershipId;
    group.membership = membership;
    group.responsibleUserId = responsibleUserId;
    group.responsibleUser = responsibleUser;
    group.startDate = startDate;
    group.endDate = endDate;
    group.status = 'active';
    group.companionCount = 0;
    group.companions = [];

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[GroupsService.createGroup] 💾 ANTES DE GUARDAR - Valores del grupo:`);
    console.log(`  - group.responsibleUserId: "${group.responsibleUserId}"`);
    console.log(`  - responsibleUserId (parámetro): "${responsibleUserId}"`);
    console.log(`  - Tipo: ${typeof group.responsibleUserId}`);
    console.log(`  - Length: ${(group.responsibleUserId as string).length}`);
    console.log(`${'='.repeat(80)}\n`);

    const savedGroup = await this.groupRepository.save(group);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`[GroupsService.createGroup] ✅ DESPUÉS DE GUARDAR - Valores guardados:`);
    console.log(`  - savedGroup.responsibleUserId: "${savedGroup.responsibleUserId}"`);
    console.log(`${'='.repeat(80)}\n`);

    return savedGroup;
  }

  async getGroupById(groupId: string): Promise<Group> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['membership', 'responsibleUser', 'companions', 'companions.member', 'companions.member.user'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    return group;
  }

  async getAllActiveGroups(): Promise<Group[]> {
    // Consulta simple: retorna TODOS los grupos sin relaciones
    // Flutter no carga las relaciones nested, solo los IDs
    console.log(`[GroupsService] 🔍 Buscando todos los grupos...`);
    const groups = await this.groupRepository.find();
    console.log(`[GroupsService] ✅ Encontrados ${groups.length} grupos`);
    console.log(`[GroupsService] 📦 Grupos:`, groups.map(g => ({ id: g.id, name: g.name })));
    return groups;
  }

  async getGroupsByUserId(userId: string): Promise<Group[]> {
    console.log(`[GroupsService] 🔍 getGroupsByUserId(${userId})`);
    console.log(`[GroupsService] userId type: ${typeof userId}`);
    
    // 1. Encontrar el Member del User
    console.log(`[GroupsService] 🔍 Buscando Member para userId: ${userId}`);
    
    // Primero, vamos a verificar cuántos Members hay en total
    const allMembers = await this.memberRepository.find();
    console.log(`[GroupsService] Total de Members en BD: ${allMembers.length}`);
    allMembers.forEach((m, i) => {
      console.log(`[GroupsService]   Member ${i}: id=${m.id}, userId=${m.userId}`);
    });
    
    const member = await this.memberRepository.findOne({
      where: { userId },
    });
    
    if (!member) {
      console.log(`[GroupsService] ⚠️  No se encontró Member para userId: ${userId}`);
      return [];
    }
    
    console.log(`[GroupsService] ✅ Member encontrado: ${member.id}`);
    
    // 2. Usar el memberId para obtener los grupos
    return this.getGroupsByMemberId(member.id);
  }

  async getGroupsByMemberId(memberId: string): Promise<Group[]> {
    console.log(`[GroupsService] 🔍 getGroupsByMemberId(${memberId})`);
    
    // Obtener grupos donde es responsable
    console.log(`[GroupsService] 🔍 Buscando grupos como responsable...`);
    const responsibleGroups = await this.groupRepository.find({
      where: { responsibleUserId: memberId },
      relations: ['membership', 'responsibleUser', 'companions', 'companions.member'],
    });
    console.log(`[GroupsService] ✅ ${responsibleGroups.length} grupos como responsable`);

    // Obtener grupos donde es acompañante
    console.log(`[GroupsService] 🔍 Buscando grupos como acompañante...`);
    const companionGroups = await this.groupRepository
      .createQueryBuilder('group')
      .leftJoinAndSelect(
        'group.companions',
        'companion',
        'companion.memberId = :memberId',
        { memberId },
      )
      .leftJoinAndSelect('group.membership', 'membership')
      .leftJoinAndSelect('group.responsibleUser', 'responsibleUser')
      .where('companion.memberId = :memberId', { memberId })
      .getMany();
    console.log(`[GroupsService] ✅ ${companionGroups.length} grupos como acompañante`);

    // Combinar y eliminar duplicados
    const allGroups = [...responsibleGroups, ...companionGroups];
    const uniqueGroups = Array.from(new Map(allGroups.map((g) => [g.id, g])).values());
    console.log(`[GroupsService] ✅ Total de ${uniqueGroups.length} grupos únicos`);
    
    return uniqueGroups;
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
    if (group.responsibleUserId !== requestingMemberId) {
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
    userRole?: string,
  ): Promise<GroupCompanion> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable o usuarios con roles específicos pueden agregar acompañantes
    const isResponsible = group.responsibleUserId === requestingMemberId;
    const isAuthorizedRole = userRole && ['admin', 'encargado', 'empleado_cajero'].includes(userRole);

    if (!isResponsible && !isAuthorizedRole) {
      throw new BadRequestException(
        'No tienes permisos para agregar acompañantes a este grupo',
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
    newCompanion.memberId = memberId;
    newCompanion.relationship = relationship || '';
    newCompanion.status = 'active';

    // Validación adicional antes de guardar
    if (!newCompanion.groupId) {
      throw new BadRequestException('groupId no puede estar vacío');
    }
    if (!newCompanion.memberId) {
      throw new BadRequestException('memberId no puede estar vacío');
    }

    // Usar insert en lugar de save para asegurar que es una inserción pura (sin triggers de update)
    await this.groupCompanionRepository.insert(newCompanion);

    // Incrementar contador de acompañantes usando un UPDATE directo
    // para evitar que TypeORM intente sincronizar las relaciones
    await this.groupRepository.update(
      { id: groupId },
      { companionCount: () => 'companionCount + 1' }
    );

    // Retornar el objeto directamente sin hacer query adicional
    return newCompanion;
  }

  async removeCompanionFromGroup(
    groupId: string,
    companionId: string,
    requestingMemberId: string,
    userRole?: string,
  ): Promise<void> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable o usuarios con roles específicos pueden remover acompañantes
    const isResponsible = group.responsibleUserId === requestingMemberId;
    const isAuthorizedRole = userRole && ['admin', 'encargado', 'empleado_cajero'].includes(userRole);
    
    if (!isResponsible && !isAuthorizedRole) {
      throw new BadRequestException(
        'No tienes permisos para remover acompañantes de este grupo',
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
    newResponsibleUserId: string,
    requestingMemberId: string,
  ): Promise<Group> {
    const group = await this.getGroupById(groupId);

    // Validar que solo el responsable actual puede transferir
    if (group.responsibleUserId !== requestingMemberId) {
      throw new BadRequestException(
        'Solo el responsable actual puede transferir la responsabilidad',
      );
    }

    // Validar que el nuevo responsable es acompañante del grupo
    // Buscar primero el miembro por userId
    const member = await this.memberRepository.findOne({
      where: { userId: newResponsibleUserId },
    });
    if (!member) {
      throw new BadRequestException('Usuario no encontrado como miembro');
    }

    const companion = await this.groupCompanionRepository.findOne({
      where: { groupId, memberId: member.id },
    });

    if (!companion) {
      throw new BadRequestException(
        'El nuevo responsable debe ser un acompañante del grupo',
      );
    }

    // Cambiar membresía del antiguo responsable a 'companion'
    // Primero obtener el miembro del responsable actual
    const oldResponsibleMember = await this.memberRepository.findOne({
      where: { userId: group.responsibleUserId },
    });
    
    const oldResponsibleMembership = await this.memberMembershipRepository.findOne(
      {
        where: {
          memberId: oldResponsibleMember?.id,
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
          memberId: member.id,
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
    group.responsibleUserId = newResponsibleUserId;
    return await this.groupRepository.save(group);
  }
}
