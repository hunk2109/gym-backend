import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Group } from '../../entities/group.entity';
import { GroupCompanion } from '../../entities/group-companion.entity';
import { Member } from '../../entities/member.entity';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { User } from '../../entities/user.entity';
import { Payment, PaymentStatus, PaymentMethod, PaymentType } from '../../entities/payment.entity';
import { EmailService } from '../email-settings/email.service';

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
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private emailService: EmailService,
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
    // Usar QueryBuilder con leftJoinAndSelect para cargar companions frescos
    const group = await this.groupRepository
      .createQueryBuilder('group')
      .where('group.id = :id', { id: groupId })
      .leftJoinAndSelect('group.membership', 'membership')
      .leftJoinAndSelect('group.companions', 'companions')
      .leftJoinAndSelect('companions.member', 'member')
      .leftJoinAndSelect('member.user', 'memberUser')
      .getOne();

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Cargar responsibleUser de forma independiente basada en responsibleUserId
    console.log(`[getGroupById] 📋 Cargando responsibleUser para responsibleUserId: ${group.responsibleUserId}`);
    if (group.responsibleUserId) {
      const responsibleUser = await this.userRepository.findOne({
        where: { id: group.responsibleUserId },
      });
      console.log(`[getGroupById] ✅ responsibleUser encontrado: ${responsibleUser?.id} - ${responsibleUser?.firstName} ${responsibleUser?.lastName}`);
      if (responsibleUser) {
        group.responsibleUser = responsibleUser;
      }
    }

    // Asegurar que membership está presente
    console.log(`[getGroupById] 📋 Membership: ${group.membership ? `CARGADA - maxGroupCompanions: ${group.membership.maxGroupCompanions}` : 'NO CARGADA'}`);

    console.log(`[getGroupById] 🔙 Retornando grupo - responsibleUserId: ${group.responsibleUserId}, responsibleUser.id: ${group.responsibleUser?.id}`);
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

  async deleteGroup(
    groupId: string,
    requestingMemberId: string,
    userRole?: string,
  ): Promise<void> {
    const group = await this.getGroupById(groupId);

    // ADMIN y ENCARGADO pueden eliminar cualquier grupo
    const isAuthorizedRole =
      userRole && ['admin', 'encargado'].includes(userRole.toLowerCase());

    if (!isAuthorizedRole) {
      // Si no es ADMIN/ENCARGADO, validar que sea el responsable del grupo
      const requestingMember = await this.memberRepository.findOne({
        where: { id: requestingMemberId },
        relations: ['user'],
      });

      if (!requestingMember) {
        throw new BadRequestException('Miembro no encontrado');
      }

      if (group.responsibleUserId !== requestingMember.user.id) {
        throw new BadRequestException(
          'Solo el responsable del grupo puede eliminarlo',
        );
      }
    }

    console.log(`[deleteGroup] 🗑️ Eliminando grupo: ${groupId}`);

    // Obtener todos los acompañantes del grupo
    const companions = await this.groupCompanionRepository.find({
      where: { groupId },
    });

    console.log(`[deleteGroup] 👥 Encontrados ${companions.length} acompañantes`);

    // Remover membresía de cada acompañante
    for (const companion of companions) {
      console.log(
        `[deleteGroup] 🗑️ Removiendo membresía del acompañante: ${companion.memberId}`,
      );
      await this.memberMembershipRepository.delete({
        memberId: companion.memberId,
      });
    }

    console.log(`[deleteGroup] ✅ Membresías de acompañantes removidas`);

    // Eliminar el grupo
    await this.groupRepository.remove(group);

    console.log(`[deleteGroup] ✅ Grupo eliminado exitosamente`);
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
    console.log(`[addCompanionToGroup] ✅ GroupCompanion creado: ${newCompanion.id}`);

    // Crear la membresía para el acompañante
    // IMPORTANTE: Obtener las fechas del responsable del grupo para que sean iguales
    // Primero, obtener el memberId del responsable usando su userId
    const responsibleMember = await this.memberRepository.findOne({
      where: { userId: group.responsibleUserId },
    });

    if (!responsibleMember) {
      throw new BadRequestException(
        'No se encontró el miembro responsable del grupo',
      );
    }

    const responsibleMembership = await this.memberMembershipRepository.findOne({
      where: {
        memberId: responsibleMember.id,
        groupId: groupId,
        membershipType: 'responsible',
      },
    });

    if (!responsibleMembership) {
      throw new BadRequestException(
        'No se encontró la membresía del responsable del grupo',
      );
    }

    console.log(`[addCompanionToGroup] 📅 Fechas del responsable - startDate: ${responsibleMembership.startDate}, endDate: ${responsibleMembership.endDate}`);

    const memberMembership = new MemberMembership();
    memberMembership.id = uuidv4();
    memberMembership.memberId = memberId;
    memberMembership.membershipId = group.membershipId;
    memberMembership.groupId = groupId;
    memberMembership.membershipType = 'companion';
    memberMembership.startDate = responsibleMembership.startDate; // ✅ Usar fecha de inicio del responsable
    memberMembership.endDate = responsibleMembership.endDate; // ✅ Usar fecha de fin del responsable
    // ✅ Guardar el costo del acompañante en payAmount (para rastrear variable pricing)
    const companionCost = group.membership.pricePerCompanion || 0;
    memberMembership.payAmount = companionCost;

    // 🔍 Verificar si el responsable tiene un Payment PENDIENTE
    const responsiblePendingPayment = await this.paymentRepository
      .createQueryBuilder('payment')
      .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
      .where('mm.memberId = :memberId', { memberId: responsibleMember.id })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.paymentType = :paymentType', { paymentType: 'MEMBERSHIP' })
      .orderBy('payment.createdAt', 'DESC')
      .getOne();

    console.log(`[addCompanionToGroup] 🔍 Responsable Payment PENDING: ${responsiblePendingPayment ? 'SÍ' : 'NO'}`);

    if (responsiblePendingPayment) {
      // ✅ CONSOLIDADO: El responsable tiene Payment PENDING
      console.log(`[addCompanionToGroup] 💰 PAYMENTS CONSOLIDADOS - Acompañante se agregará al Payment existente del responsable`);
      console.log(`[addCompanionToGroup]   - Payment ID: ${responsiblePendingPayment.id}`);
      console.log(`[addCompanionToGroup]   - Amount actual: $${responsiblePendingPayment.amount}`);
      console.log(`[addCompanionToGroup]   - Costo acompañante: $${companionCost}`);
      
      // Vincular memberMembership al Payment existente del responsable
      memberMembership.paymentId = responsiblePendingPayment.id;
    } else {
      // ✅ SEPARADO: El responsable NO tiene Payment PENDING
      // Crear Payment nuevo para el acompañante
      console.log(`[addCompanionToGroup] 💰 PAYMENTS SEPARADOS - Crear Payment nuevo para el acompañante`);
      
      const companionPayment = new Payment();
      companionPayment.id = uuidv4();
      companionPayment.amount = companionCost as any;
      companionPayment.paymentDate = null;
      companionPayment.dueDate = responsibleMembership.endDate;
      companionPayment.status = PaymentStatus.PENDING;
      companionPayment.paymentMethod = PaymentMethod.CASH;
      companionPayment.paymentType = PaymentType.MEMBERSHIP;
      companionPayment.createdBy = null;
      companionPayment.updatedBy = null;
      
      const savedPayment = await this.paymentRepository.save(companionPayment);
      console.log(`[addCompanionToGroup] ✅ Payment creado para acompañante: ${savedPayment.id}`);
      
      // Vincular memberMembership al Payment nuevo
      memberMembership.paymentId = savedPayment.id;
    }

    await this.memberMembershipRepository.insert(memberMembership);
    console.log(`[addCompanionToGroup] ✅ MemberMembership creada: ${memberMembership.id}`);

    // Incrementar contador de acompañantes usando un UPDATE directo
    // para evitar que TypeORM intente sincronizar las relaciones
    await this.groupRepository.update(
      { id: groupId },
      { companionCount: () => 'companionCount + 1' }
    );
    console.log(`[addCompanionToGroup] ✅ Contador de acompañantes incrementado`);

    // Recalcular el pago del grupo basado en la nueva cantidad de miembros
    // (solo actualiza el Payment del responsable, no el del acompañante)
    await this.recalculateGroupPayment(groupId);

    // Enviar email de notificación al miembro agregado al grupo (sin esperar - fire and forget)
    // Esto evita retrasar la respuesta de la API mientras se envía el email
    this.sendAddCompanionEmail(memberId, relationship, group).catch((err) => {
      console.error(`[addCompanionToGroup] ❌ Error al enviar email de bienvenida:`, err.message);
    });

    // Retornar el objeto directamente sin hacer query adicional
    return newCompanion;
  }

  /// Método privado para enviar email de bienvenida del acompañante (fire-and-forget)
  private async sendAddCompanionEmail(
    memberId: string,
    relationship: string,
    group: Group,
  ): Promise<void> {
    try {
      const companionWithUser = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['user'],
      });

      if (companionWithUser?.user?.email) {
        const companionEmail = companionWithUser.user.email;
        const companionName = companionWithUser.user.firstName || companionWithUser.user.email;
        const groupName = group.name;
        const membershipName = group.membership?.name || 'Membresía';
        const endDateFormatted = new Date(group.endDate).toLocaleDateString('es-ES');

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">✓ ¡Se ha agregado a un grupo!</h2>
            <p>Hola <strong>${companionName}</strong>,</p>
            <p>Te complace comunicarte que has sido agregado como miembro de un grupo de membresía.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Detalles del Grupo:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Grupo</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${groupName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Relación</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${relationship || 'Acompañante'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Vigencia hasta</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${endDateFormatted}</td>
                </tr>
              </table>
            </div>

            <p>Ahora puedes acceder a todas las instalaciones y servicios del gimnasio. Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático. Por favor no responder a este correo.
            </p>
          </div>
        `;

        await this.emailService.sendEmail({
          recipientEmail: companionEmail,
          recipientName: companionName,
          subject: `✓ Bienvenido al Grupo - ${groupName}`,
          htmlContent,
        });

        console.log(`[sendAddCompanionEmail] ✅ Email de bienvenida enviado a: ${companionEmail}`);
      }
    } catch (emailError) {
      console.error(`[sendAddCompanionEmail] ❌ Error:`, emailError.message);
      // No lanzar error, solo loguear
    }
  }

  async removeCompanionFromGroup(
    groupId: string,
    companionId: string,
    requestingMemberId: string,
    userRole?: string,
  ): Promise<Group> {
    console.log(`[removeCompanionFromGroup] 🗑️  Eliminando acompañante: ${companionId} del grupo: ${groupId}`);
    
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    // Validar que solo el responsable o usuarios con roles específicos pueden remover acompañantes
    const isResponsible = group.responsibleUserId === requestingMemberId;
    const isAuthorizedRole = userRole && ['admin', 'encargado', 'empleado_cajero'].includes(userRole);
    
    console.log(`[removeCompanionFromGroup] isResponsible: ${isResponsible}, isAuthorizedRole: ${isAuthorizedRole}, userRole: ${userRole}`);
    
    if (!isResponsible && !isAuthorizedRole) {
      throw new BadRequestException(
        'No tienes permisos para remover acompañantes de este grupo',
      );
    }

    const companion = await this.groupCompanionRepository.findOne({
      where: { id: companionId },
    });

    console.log(`[removeCompanionFromGroup] ✅ Acompañante encontrado:`, companion);

    if (!companion) {
      throw new NotFoundException('Acompañante no encontrado');
    }

    if (companion.groupId !== groupId) {
      throw new BadRequestException(
        'El acompañante no pertenece a este grupo',
      );
    }

    // Eliminar la membresía del acompañante
    console.log(`[removeCompanionFromGroup] 🗑️  Eliminando membresía del acompañante para memberId: ${companion.memberId}, groupId: ${groupId}`);
    
    // Primero, obtener las membresías para ver qué existe
    const existingMemberships = await this.memberMembershipRepository.find({
      where: {
        memberId: companion.memberId,
        groupId: groupId,
      },
    });
    console.log(`[removeCompanionFromGroup] 📋 Membresías existentes:`, existingMemberships);
    console.log(`[removeCompanionFromGroup] 📋 Membresías IDs:`, existingMemberships.map(m => m.id));

    // Manejar Payments del acompañante
    console.log(`[removeCompanionFromGroup] 🗑️  Analizando pagos del acompañante`);
    
    if (existingMemberships.length > 0) {
      for (const membership of existingMemberships) {
        // Obtener el payment vinculado a esta membresía
        const payment = await this.paymentRepository.findOne({
          where: { id: membership.paymentId },
        });

        if (payment) {
          console.log(`[removeCompanionFromGroup] 💳 Payment encontrado: ${payment.id}, status: ${payment.status}`);
          
          // El payment es del acompañante
          console.log(`[removeCompanionFromGroup] ✅ PAGO SEPARADO - Se eliminará el Payment del acompañante: ${payment.id}`);
          
          // Eliminar este payment
          await this.paymentRepository.delete({ id: payment.id });
          console.log(`[removeCompanionFromGroup] ✅ Payment eliminado: ${payment.id}`);
        }
      }
    } else {
      console.log(`[removeCompanionFromGroup] ⚠️  No hay membresías para este acompañante`);
    }

    const membershipDeleteResult = await this.memberMembershipRepository.delete({
      memberId: companion.memberId,
      groupId: groupId,
      membershipType: 'companion',
    });
    console.log(`[removeCompanionFromGroup] ✅ Membresías eliminadas:`, membershipDeleteResult.affected);

    // Eliminar acompañante verificando que realmente se eliminó
    console.log(`[removeCompanionFromGroup] 🗑️  Eliminando GroupCompanion con id: ${companionId}`);
    
    // Verificar que existe antes de eliminar
    const companionBefore = await this.groupCompanionRepository.findOne({
      where: { id: companionId },
    });
    console.log(`[removeCompanionFromGroup] 📋 Companion antes de eliminar:`, companionBefore ? 'EXISTE' : 'NO EXISTE');
    
    // Usar delete directo en el repository
    const removeResult = await this.groupCompanionRepository.delete({
      id: companionId,
    });
    console.log(`[removeCompanionFromGroup] ✅ Delete resultado - affected:`, removeResult.affected);
    
    // Verificar que se eliminó después con query builder para forzar lectura de BD
    const companionAfter = await this.groupCompanionRepository
      .createQueryBuilder('gc')
      .where('gc.id = :id', { id: companionId })
      .getOne();
    console.log(`[removeCompanionFromGroup] 📋 Companion después de eliminar:`, companionAfter ? 'EXISTE ❌' : 'NO EXISTE ✅');

    // Decrementar contador
    console.log(`[removeCompanionFromGroup] 📝 Decrementando contador de acompañantes`);
    await this.groupRepository.update(
      { id: groupId },
      { companionCount: () => 'companionCount - 1' }
    );
    console.log(`[removeCompanionFromGroup] ✅ Grupo actualizado - contador decrementado`);

    // Recalcular el pago del grupo basado en la nueva cantidad de miembros
    await this.recalculateGroupPayment(groupId);

    // Enviar email de notificación al miembro removido del grupo (sin esperar - fire and forget)
    // Esto evita retrasar la respuesta de la API mientras se envía el email
    this.sendRemoveCompanionEmail(companion.memberId, group).catch((err) => {
      console.error(`[removeCompanionFromGroup] ❌ Error al enviar email de notificación:`, err.message);
    });

    // Limpiar cache de TypeORM para forzar que recargue desde BD
    await this.groupRepository.manager.connection.queryResultCache?.remove([groupId]);
    
    // Retornar grupo actualizado
    const result = await this.getGroupById(groupId);
    console.log(`[removeCompanionFromGroup] ✅ Grupo retornado`);
    return result;
  }

  /// Método privado para enviar email de notificación al acompañante removido (fire-and-forget)
  private async sendRemoveCompanionEmail(
    memberId: string,
    group: Group,
  ): Promise<void> {
    try {
      const companionWithUser = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['user'],
      });

      if (companionWithUser?.user?.email) {
        const companionEmail = companionWithUser.user.email;
        const companionName = companionWithUser.user.firstName || companionWithUser.user.email;
        const groupName = group.name;
        const membershipName = group.membership?.name || 'Membresía';

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;">Notificación de Cambio en Grupo</h2>
            <p>Hola <strong>${companionName}</strong>,</p>
            <p>Te informamos que has sido removido del grupo de membresía.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Detalles:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Grupo</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${groupName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Estado</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #dc3545; font-weight: bold;">Removido</td>
                </tr>
              </table>
            </div>

            <p>Si tienes alguna pregunta sobre este cambio, por favor contacta a nuestro equipo.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático. Por favor no responder a este correo.
            </p>
          </div>
        `;

        await this.emailService.sendEmail({
          recipientEmail: companionEmail,
          recipientName: companionName,
          subject: `Notificación: Has sido removido del Grupo - ${groupName}`,
          htmlContent,
        });

        console.log(`[sendRemoveCompanionEmail] ✅ Email de notificación enviado a: ${companionEmail}`);
      }
    } catch (emailError) {
      console.error(`[sendRemoveCompanionEmail] ❌ Error:`, emailError.message);
      // No lanzar error, solo loguear
    }
  }

  async transferResponsibility(
    groupId: string,
    newResponsibleMemberId: string,
    requestingUserId: string,
    requestingUserRole?: string,
  ): Promise<Group> {
    console.log(`[TransferResponsibility] 🚀 INICIANDO TRANSFERENCIA DE RESPONSABILIDAD`);
    console.log(`[TransferResponsibility] - groupId: ${groupId}`);
    console.log(`[TransferResponsibility] - newResponsibleMemberId: ${newResponsibleMemberId}`);
    console.log(`[TransferResponsibility] - requestingUserId: ${requestingUserId}`);
    console.log(`[TransferResponsibility] - requestingUserRole: ${requestingUserRole}`);
    
    // Obtener grupo sin cache para esta operación
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['membership'],
    });

    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    console.log(`[TransferResponsibility] 📋 Grupo cargado - id: ${group.id}, groupId: ${group.id}, membershipId: ${group.membershipId}`);

    // Permitir si es responsable actual, admin o encargado
    const isResponsible = group.responsibleUserId === requestingUserId;
    const isAdminOrManager = requestingUserRole && ['admin', 'encargado'].includes(requestingUserRole);
    if (!isResponsible && !isAdminOrManager) {
      throw new BadRequestException(
        'Solo el responsable actual, un admin o encargado pueden transferir la responsabilidad',
      );
    }

    // Validar que el nuevo responsable existe como miembro
    console.log(`[TransferResponsibility] 🔍 Validando nuevo responsable - newResponsibleMemberId: ${newResponsibleMemberId}`);
    
    const newResponsibleMemberExists = await this.memberRepository.findOne({
      where: { id: newResponsibleMemberId },
    });

    if (!newResponsibleMemberExists) {
      throw new BadRequestException('El nuevo responsable no existe como miembro');
    }

    console.log(`[TransferResponsibility] ✅ Nuevo responsable es miembro válido`);

    // Obtener el userId del nuevo responsable desde el miembro
    const newResponsibleMember = await this.memberRepository.findOne({
      where: { id: newResponsibleMemberId },
      relations: ['user'],
    });
    
    console.log(`[TransferResponsibility] 🔍 newResponsibleMember: ${JSON.stringify(newResponsibleMember)}`);
    console.log(`[TransferResponsibility] 🔍 newResponsibleMember.userId: ${newResponsibleMember?.userId}`);
    
    if (!newResponsibleMember) {
      throw new BadRequestException('Miembro no encontrado');
    }
    if (!newResponsibleMember.userId) {
      throw new BadRequestException('El miembro no tiene userId asociado');
    }
    
    const newResponsibleUserId = newResponsibleMember.userId;
    
    console.log(`[TransferResponsibility] ✅ newResponsibleUserId: ${newResponsibleUserId}`);

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

    // Crear un GroupCompanion para el antiguo responsable si no existe
    if (oldResponsibleMember) {
      const oldResponsibleCompanion = await this.groupCompanionRepository.findOne({
        where: { groupId, memberId: oldResponsibleMember.id },
      });

      if (!oldResponsibleCompanion) {
        const newCompanion = new GroupCompanion();
        newCompanion.id = uuidv4();
        newCompanion.groupId = groupId;
        newCompanion.memberId = oldResponsibleMember.id;
        newCompanion.relationship = 'ex_responsible'; // Marcar como ex-responsable
        newCompanion.status = 'active';

        console.log(`[TransferResponsibility] 📝 Creando companion - id: ${newCompanion.id}, groupId: ${newCompanion.groupId}, memberId: ${newCompanion.memberId}`);
        await this.groupCompanionRepository.insert(newCompanion);
        console.log(`[TransferResponsibility] ✅ Antiguo responsable agregado como acompañante`);

        // Crear también la membresía del antiguo responsable
        const oldMemberMembership = new MemberMembership();
        oldMemberMembership.id = uuidv4();
        oldMemberMembership.memberId = oldResponsibleMember.id;
        oldMemberMembership.membershipId = group.membershipId;
        oldMemberMembership.groupId = groupId;
        oldMemberMembership.membershipType = 'companion';
        oldMemberMembership.startDate = new Date();
        oldMemberMembership.endDate = group.endDate;

        await this.memberMembershipRepository.insert(oldMemberMembership);
        console.log(`[TransferResponsibility] ✅ MemberMembership creada para antiguo responsable`);

        // Incrementar contador de acompañantes
        await this.groupRepository.update(
          { id: groupId },
          { companionCount: () => 'companionCount + 1' }
        );
      }
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

    // Remover el nuevo responsable de GroupCompanion si existe
    const newResponsibleCompanion = await this.groupCompanionRepository.findOne({
      where: { groupId, memberId: newResponsibleMemberId },
    });

    if (newResponsibleCompanion) {
      console.log(`[TransferResponsibility] 🗑️  Removiendo nuevo responsable de companions`);
      await this.groupCompanionRepository
        .createQueryBuilder()
        .delete()
        .from(GroupCompanion)
        .where('id = :id', { id: newResponsibleCompanion.id })
        .execute();
      console.log(`[TransferResponsibility] ✅ Nuevo responsable removido de acompañantes`);

      // Decrementar contador de acompañantes
      await this.groupRepository.update(
        { id: groupId },
        { companionCount: () => 'companionCount - 1' }
      );
    } else {
      console.log(`[TransferResponsibility] ℹ️  Nuevo responsable no es companion (probablemente era responsable actual)`);
    }

    // Actualizar grupo usando UPDATE directo para evitar sincronización de relaciones
    console.log(`[TransferResponsibility] 📝 Actualizando grupo - responsibleUserId: ${group.responsibleUserId} → ${newResponsibleUserId}`);
    await this.groupRepository.update(
      { id: groupId },
      { responsibleUserId: newResponsibleUserId }
    );
    console.log(`[TransferResponsibility] ✅ Grupo actualizado`);

    // Enviar emails de notificación a ambos miembros
    try {
      console.log(`[TransferResponsibility] 📧 INICIANDO ENVÍO DE EMAILS`);
      console.log(`[TransferResponsibility] - newResponsibleMember:`, newResponsibleMember);
      console.log(`[TransferResponsibility] - oldResponsibleMember:`, oldResponsibleMember);
      
      const groupName = group.name;
      const membershipName = group.membership?.name || 'Membresía';
      const membershipPrice = Number(group.membership?.price) || 0;

      console.log(`[TransferResponsibility] - groupName: ${groupName}`);
      console.log(`[TransferResponsibility] - membershipPrice: ${membershipPrice}`);

      // Email al nuevo responsable
      const newResponsibleEmail = newResponsibleMember.user?.email;
      const newResponsibleName = newResponsibleMember.user?.firstName || newResponsibleMember.user?.email;

      console.log(`[TransferResponsibility] 📧 Nuevo responsable - Email: ${newResponsibleEmail}, Name: ${newResponsibleName}`);

      if (newResponsibleEmail) {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">✓ ¡Eres el nuevo responsable del grupo!</h2>
            <p>Hola <strong>${newResponsibleName}</strong>,</p>
            <p>Te comunicamos que ahora eres el responsable del grupo de membresía.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Información del Grupo:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Grupo</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${groupName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #28a745;">Costo de Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #28a745;">RD\$ ${membershipPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Tu Rol</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #28a745; font-weight: bold;">Responsable</td>
                </tr>
              </table>
            </div>

            <p>Como responsable, tendrás acceso a gestionar los miembros del grupo y otros detalles administrativos. Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático. Por favor no responder a este correo.
            </p>
          </div>
        `;

        await this.emailService.sendEmail({
          recipientEmail: newResponsibleEmail,
          recipientName: newResponsibleName,
          subject: `✓ Eres el nuevo Responsable del Grupo - ${groupName}`,
          htmlContent,
        });

        console.log(`[TransferResponsibility] ✅ Email enviado al nuevo responsable: ${newResponsibleEmail}`);
      }

      // Email al antiguo responsable
      if (oldResponsibleMember?.user?.email) {
        const oldResponsibleEmail = oldResponsibleMember.user.email;
        const oldResponsibleName = oldResponsibleMember.user.firstName || oldResponsibleMember.user.email;

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ffc107;">ℹ️ Cambio en la Responsabilidad del Grupo</h2>
            <p>Hola <strong>${oldResponsibleName}</strong>,</p>
            <p>Te informamos que la responsabilidad del grupo ha sido transferida a otro miembro.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Información del Grupo:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Grupo</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${groupName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${membershipName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Costo de Membresía</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">RD\$ ${membershipPrice.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Tu Rol</td>
                  <td style="padding: 10px; border: 1px solid #ddd; color: #ffc107; font-weight: bold;">Acompañante</td>
                </tr>
              </table>
            </div>

            <p>Ahora eres miembro del grupo como acompañante y sigues teniendo acceso a todos los servicios del gimnasio. Si tienes alguna pregunta, no dudes en contactarnos.</p>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              Este es un correo automático. Por favor no responder a este correo.
            </p>
          </div>
        `;

        await this.emailService.sendEmail({
          recipientEmail: oldResponsibleEmail,
          recipientName: oldResponsibleName,
          subject: `ℹ️ Cambio en la Responsabilidad del Grupo - ${groupName}`,
          htmlContent,
        });

        console.log(`[TransferResponsibility] ✅ Email enviado al antiguo responsable: ${oldResponsibleEmail}`);
      }
    } catch (emailError) {
      console.error(`[TransferResponsibility] ❌ Error al enviar emails:`, emailError.message);
      // No bloquear el flujo si hay error en el email
    }
    
    // Retornar el grupo con todas sus relaciones cargadas
    const result = await this.getGroupById(groupId);
    console.log(`[TransferResponsibility] ✅ Grupo retornado - responsibleUserId: ${result.responsibleUserId}`);
    return result;
  }

  async getGroupsByResponsibleMember(memberId: string): Promise<Group[]> {
    try {
      console.log(
        `[getGroupsByResponsibleMember] 🔍 Obteniendo grupos para miembro: ${memberId}`,
      );

      // Primero obtener el usuario asociado al miembro
      const member = await this.memberRepository.findOne({
        where: { id: memberId },
        relations: ['user'],
      });

      if (!member) {
        console.log(`[getGroupsByResponsibleMember] ⚠️ Miembro no encontrado`);
        return [];
      }

      console.log(
        `[getGroupsByResponsibleMember] 👤 Miembro encontrado, userId: ${member.user.id}`,
      );

      // Buscar grupos donde este usuario es responsable
      const groups = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.membership', 'membership')
        .leftJoinAndSelect('group.responsibleUser', 'responsibleUser')
        .leftJoinAndSelect('group.companions', 'companions')
        .leftJoinAndSelect('companions.member', 'member')
        .leftJoinAndSelect('member.user', 'memberUser')
        .where('group.responsibleUserId = :userId', { userId: member.user.id })
        .cache(0)
        .getMany();

      console.log(
        `[getGroupsByResponsibleMember] ✅ ${groups.length} grupo(s) encontrado(s)`,
      );

      return groups;
    } catch (error) {
      console.error(
        `[getGroupsByResponsibleMember] ❌ Error: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Recalcular el monto del pago del grupo basado en la cantidad de miembros actuales
   * Precio de membresía × (1 responsable + cantidad de acompañantes activos)
   */
  private async recalculateGroupPayment(groupId: string): Promise<void> {
    try {
      console.log(`[recalculateGroupPayment] 🔄 Recalculando pago para grupo: ${groupId}`);

      // Obtener grupo con membresía y acompañantes
      const group = await this.groupRepository
        .createQueryBuilder('group')
        .leftJoinAndSelect('group.membership', 'membership')
        .leftJoinAndSelect('group.companions', 'companions')
        .where('group.id = :id', { id: groupId })
        .getOne();

      if (!group) {
        console.warn(`[recalculateGroupPayment] ⚠️ Grupo no encontrado: ${groupId}`);
        return;
      }

      // Calcular cantidad de miembros: 1 responsable + acompañantes activos
      const activeCompanions = group.companions?.filter((c) => c.status === 'active').length ?? 0;
      const totalMembers = 1 + activeCompanions; // 1 responsable + acompañantes

      const membershipPrice = parseFloat(group.membership.price as any) || 0;
      
      // Calcular monto según el tipo de precio
      let newAmount: number;
      
      if (group.membership.priceType === 'variable' && group.membership.pricePerCompanion) {
        // Fórmula: basePrice + (activeCompanions × pricePerCompanion)
        const pricePerCompanion = parseFloat(group.membership.pricePerCompanion as any) || 0;
        newAmount = membershipPrice + (activeCompanions * pricePerCompanion);
        
        console.log(`[recalculateGroupPayment] 📊 Cálculo VARIABLE:`);
        console.log(`  - Precio base membresía: $${membershipPrice}`);
        console.log(`  - Precio por acompañante: $${pricePerCompanion}`);
        console.log(`  - Acompañantes activos: ${activeCompanions}`);
        console.log(`  - Nuevo monto total: $${newAmount} (${membershipPrice} + ${activeCompanions} × ${pricePerCompanion})`);
      } else {
        // Fórmula clásica: price × totalMembers
        newAmount = membershipPrice * totalMembers;
        
        console.log(`[recalculateGroupPayment] 📊 Cálculo FIJO:`);
        console.log(`  - Precio membresía: $${membershipPrice}`);
        console.log(`  - Miembros: 1 responsable + ${activeCompanions} acompañantes = ${totalMembers}`);
        console.log(`  - Nuevo monto total: $${newAmount}`);
      }

      // Obtener el miembro responsable del grupo para encontrar su payment PENDING
      const responsibleMember = await this.memberRepository.findOne({
        where: { userId: group.responsibleUserId },
      });

      if (!responsibleMember) {
        console.warn(`[recalculateGroupPayment] ⚠️ Miembro responsable no encontrado`);
        return;
      }

      // Buscar el payment PENDING más reciente del grupo (membresía grupal)
      const pendingPayment = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoin(MemberMembership, 'mm', 'mm.paymentId = payment.id')
        .where('mm.memberId = :memberId', { memberId: responsibleMember.id })
        .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
        .andWhere('payment.paymentType = :paymentType', { paymentType: 'MEMBERSHIP' })
        .orderBy('payment.createdAt', 'DESC')
        .getOne();

      if (pendingPayment) {
        // Actualizar el monto del payment
        console.log(`[recalculateGroupPayment] 🔍 ANTES DE ACTUALIZAR - Payment ID: ${pendingPayment.id}, Amount actual: ${pendingPayment.amount}, Nuevo monto: ${newAmount}`);
        
        pendingPayment.amount = newAmount;
        
        console.log(`[recalculateGroupPayment] 📝 Objeto pendingPayment DESPUÉS de asignar:`, {
          id: pendingPayment.id,
          amount: pendingPayment.amount,
          status: pendingPayment.status,
        });
        
        const saveResult = await this.paymentRepository.save(pendingPayment);
        
        console.log(`[recalculateGroupPayment] ✅ Pago actualizado: ${saveResult.id} - Nuevo monto: ${saveResult.amount}`);
        console.log(`[recalculateGroupPayment] 🔍 DESPUÉS DE SAVE - Verificando que se guardó:`, {
          id: saveResult.id,
          amount: saveResult.amount,
          status: saveResult.status,
        });
        
        // Verificación INMEDIATA - Leer de la BD para confirmar
        const verifyPayment = await this.paymentRepository.findOne({
          where: { id: pendingPayment.id },
        });
        
        const bdAmount = parseFloat(String(verifyPayment?.amount)) || 0;
        const expectedAmount = parseFloat(String(newAmount)) || 0;
        
        console.log(`[recalculateGroupPayment] 🔍 VERIFICACIÓN EN BD - Amount en BD: ${bdAmount}, Expected: ${expectedAmount}`);
        
        if (Math.abs(bdAmount - expectedAmount) > 0.01) {
          console.error(`[recalculateGroupPayment] ❌ ERROR: El monto en BD (${bdAmount}) NO coincide con el nuevo monto (${expectedAmount})`);
        } else {
          console.log(`[recalculateGroupPayment] ✅ CONFIRMADO: Monto guardado correctamente en BD: $${bdAmount}`);
        }
      } else {
        console.warn(`[recalculateGroupPayment] ⚠️ No se encontró pago PENDING para el responsable`);
      }
    } catch (error) {
      console.error(`[recalculateGroupPayment] ❌ Error: ${error.message}`);
      // No lanzar error - no debe bloquear la operación principal
    }
  }
}
