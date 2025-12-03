import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupMembership, GroupMembershipStatus } from '../../entities/group-membership.entity';
import { GroupMembershipUser, GroupMembershipUserStatus } from '../../entities/group-membership-user.entity';
import { User } from '../../entities/user.entity';
import { Membership } from '../../entities/membership.entity';
import {
  CreateGroupMembershipDto,
  UpdateGroupMembershipDto,
  AddMemberToGroupDto,
  RemoveMemberFromGroupDto,
  GroupMembershipResponseDto,
} from './dto/group-membership.dto';

@Injectable()
export class GroupMembershipsService {
  constructor(
    @InjectRepository(GroupMembership)
    private groupMembershipRepository: Repository<GroupMembership>,
    @InjectRepository(GroupMembershipUser)
    private groupMembershipUserRepository: Repository<GroupMembershipUser>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
  ) {}

  async create(dto: CreateGroupMembershipDto, createdByUserId: string): Promise<GroupMembershipResponseDto> {
    // Validar que la membresía existe
    const membership = await this.membershipRepository.findOne({ where: { id: dto.membershipId } });
    if (!membership) {
      throw new Error('Membresía no encontrada');
    }

    // Validar que las fechas sean válidas
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
    }

    const groupMembership = this.groupMembershipRepository.create({
      name: dto.name,
      description: dto.description,
      membershipId: dto.membershipId,
      createdByUserId,
      maxMembers: dto.maxMembers,
      status: GroupMembershipStatus.ACTIVE,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      totalPrice: dto.totalPrice,
      paidAmount: 0,
      notes: dto.notes,
    });

    const saved = await this.groupMembershipRepository.save(groupMembership);
    return this.formatResponse(saved, membership);
  }

  async findAll(): Promise<GroupMembershipResponseDto[]> {
    const groups = await this.groupMembershipRepository.find({
      relations: ['membership', 'members', 'members.user', 'createdByUser'],
    });

    return Promise.all(
      groups.map(async (group) => {
        const membership = await this.membershipRepository.findOne({ where: { id: group.membershipId } });
        return this.formatResponse(group, membership!);
      }),
    );
  }

  async findOne(id: string): Promise<GroupMembershipResponseDto> {
    const group = await this.groupMembershipRepository.findOne({
      where: { id },
      relations: ['membership', 'members', 'members.user', 'createdByUser'],
    });

    if (!group) {
      throw new Error('Membresía grupal no encontrada');
    }

    const membership = await this.membershipRepository.findOne({ where: { id: group.membershipId } });
    return this.formatResponse(group, membership!);
  }

  async update(id: string, dto: UpdateGroupMembershipDto): Promise<GroupMembershipResponseDto> {
    const group = await this.groupMembershipRepository.findOne({ where: { id } });
    if (!group) {
      throw new Error('Membresía grupal no encontrada');
    }

    // Validar fechas si se proporcionan
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.endDate) <= new Date(dto.startDate)) {
        throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
      }
    }

    // Actualizar solo los campos que se proporcionan
    const dataToUpdate: any = {};
    if (dto.name) dataToUpdate.name = dto.name;
    if (dto.description) dataToUpdate.description = dto.description;
    if (dto.maxMembers) dataToUpdate.maxMembers = dto.maxMembers;
    if (dto.startDate) dataToUpdate.startDate = dto.startDate;
    if (dto.endDate) dataToUpdate.endDate = dto.endDate;
    if (dto.paidAmount) dataToUpdate.paidAmount = dto.paidAmount;
    if (dto.status) dataToUpdate.status = dto.status as GroupMembershipStatus;
    if (dto.notes) dataToUpdate.notes = dto.notes;

    await this.groupMembershipRepository.update(id, dataToUpdate);

    const updated = await this.groupMembershipRepository.findOne({ where: { id } });
    if (!updated) {
      throw new Error('Error al actualizar la membresía grupal');
    }

    const membership = await this.membershipRepository.findOne({ where: { id: updated.membershipId } });
    return this.formatResponse(updated, membership!);
  }

  async delete(id: string): Promise<void> {
    const group = await this.groupMembershipRepository.findOne({ where: { id } });
    if (!group) {
      throw new Error('Membresía grupal no encontrada');
    }

    await this.groupMembershipRepository.remove(group);
  }

  async addMember(groupId: string, dto: AddMemberToGroupDto): Promise<GroupMembershipResponseDto> {
    const group = await this.groupMembershipRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new Error('Membresía grupal no encontrada');
    }

    // Validar que el usuario existe
    const user = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    // Validar que no esté ya en el grupo
    const existing = await this.groupMembershipUserRepository.findOne({
      where: {
        groupMembershipId: groupId,
        userId: dto.userId,
        status: GroupMembershipUserStatus.ACTIVE,
      },
    });

    if (existing) {
      throw new Error('El usuario ya está en esta membresía grupal');
    }

    // Validar que hay espacio disponible
    if (group.currentMembers >= group.maxMembers) {
      throw new Error('La membresía grupal ha alcanzado su límite de miembros');
    }

    // Agregar el miembro
    const groupMembershipUser = this.groupMembershipUserRepository.create({
      groupMembershipId: groupId,
      userId: dto.userId,
      status: GroupMembershipUserStatus.ACTIVE,
      notes: dto.notes,
    });

    await this.groupMembershipUserRepository.save(groupMembershipUser);
    const updated = await this.groupMembershipRepository.findOne({
      where: { id: groupId },
      relations: ['membership', 'members', 'members.user', 'createdByUser'],
    });

    const membership = await this.membershipRepository.findOne({ where: { id: updated!.membershipId } });
    return this.formatResponse(updated!, membership!);
  }

  async removeMember(groupId: string, userId: string): Promise<GroupMembershipResponseDto> {
    const groupMembershipUser = await this.groupMembershipUserRepository.findOne({
      where: {
        groupMembershipId: groupId,
        userId,
      },
    });

    if (!groupMembershipUser) {
      throw new Error('Miembro no encontrado en esta membresía grupal');
    }

    // Marcar como removido en lugar de eliminar
    groupMembershipUser.status = GroupMembershipUserStatus.REMOVED;
    await this.groupMembershipUserRepository.save(groupMembershipUser);

    const group = await this.groupMembershipRepository.findOne({
      where: { id: groupId },
      relations: ['membership', 'members', 'members.user', 'createdByUser'],
    });

    const membership = await this.membershipRepository.findOne({ where: { id: group!.membershipId } });
    return this.formatResponse(group!, membership!);
  }

  async getGroupsByMember(userId: string): Promise<GroupMembershipResponseDto[]> {
    const groupMemberships = await this.groupMembershipUserRepository.find({
      where: {
        userId,
        status: GroupMembershipUserStatus.ACTIVE,
      },
      relations: ['groupMembership', 'groupMembership.membership'],
    });

    return Promise.all(
      groupMemberships.map(async (gmu) => {
        const fullGroup = await this.groupMembershipRepository.findOne({
          where: { id: gmu.groupMembership.id },
          relations: ['membership', 'members', 'members.user', 'createdByUser'],
        });
        const membership = await this.membershipRepository.findOne({
          where: { id: fullGroup!.membershipId },
        });
        return this.formatResponse(fullGroup!, membership!);
      }),
    );
  }

  private formatResponse(
    group: GroupMembership,
    membership: Membership,
  ): GroupMembershipResponseDto {
    const activeMembers = group.members?.filter((m) => m.status === GroupMembershipUserStatus.ACTIVE) || [];

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      membershipId: group.membershipId,
      createdByUserId: group.createdByUserId,
      maxMembers: group.maxMembers,
      currentMembers: activeMembers.length,
      availableSlots: Math.max(0, group.maxMembers - activeMembers.length),
      status: group.status,
      startDate: group.startDate,
      endDate: group.endDate,
      totalPrice: parseFloat(group.totalPrice.toString()),
      paidAmount: parseFloat(group.paidAmount.toString()),
      isPaid: parseFloat(group.paidAmount.toString()) >= parseFloat(group.totalPrice.toString()),
      isActive: group.isActive,
      notes: group.notes,
      members: activeMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        status: m.status,
        addedAt: m.addedAt,
        user: {
          id: m.user.id,
          name: m.user.email, // Usando email como nombre alternativo
          email: m.user.email,
        },
      })),
      membership: {
        id: membership.id,
        name: membership.name,
        price: parseFloat(membership.price.toString()),
        durationMonths: membership.durationMonths,
        benefits: membership.benefits || [],
      },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }
}
