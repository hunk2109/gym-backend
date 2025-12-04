import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Member } from '../../entities/member.entity';
import { User } from '../../entities/user.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createMemberDto: CreateMemberDto): Promise<Member> {
    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: createMemberDto.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check if member already exists for this user
    const existingMember = await this.memberRepository.findOne({
      where: { userId: createMemberDto.userId },
    });

    if (existingMember) {
      throw new BadRequestException('Member already exists for this user');
    }

    const member = this.memberRepository.create({
      id: uuidv4(),
      ...createMemberDto,
      joinDate: createMemberDto.joinDate || new Date(),
    });

    return this.memberRepository.save(member);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: any[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // Query simple con relaciones
    const data = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('member.memberships', 'memberships')
      .select([
        'member.id',
        'member.userId',
        'member.documentId',
        'member.emergencyContact',
        'member.emergencyPhone',
        'member.dateOfBirth',
        'member.gender',
        'member.address',
        'member.city',
        'member.zipCode',
        'member.joinDate',
        'member.lastVisit',
        'member.isPaid',
        'member.createdAt',
        'member.updatedAt',
        'user',
        'memberships',
      ])
      .orderBy('member.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    console.log(`[MembersService.findAll] Total de miembros obtenidos: ${data.length}`);
    if (data.length > 0) {
      console.log(`[MembersService.findAll] Primer miembro: id=${data[0].id}, userId=${data[0].userId}, type=${typeof data[0].id}`);
    }

    const total = await this.memberRepository.count();

    // Calcular hasPendingPayment para cada miembro
    const mappedData = data.map(member => {
      console.log(`[MembersService.findAll] Procesando miembro: id="${member.id}" (type: ${typeof member.id}), userId="${member.userId}"`);
      
      // Asegurar que memberships es un array
      const memberships = member.memberships || [];
      
      if (memberships.length === 0) {
        console.log(`[MembersService] Miembro ${member.id}: SIN MEMBRESÍAS → hasMembership=false`);
        const mapped = {
          ...member,
          currentMembership: null,
          hasMembership: false,
          hasPendingPayment: false,
        };
        return mapped;
      }

      // Ordenar membresías por fecha más reciente
      const sortedMemberships = memberships.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      
      const mostRecent = sortedMemberships[0];
      const isPending = mostRecent.paymentStatus === 'pending';
      
      console.log(`[MembersService] Miembro ${member.id}: hasMembership=true, hasPendingPayment=${isPending}`);
      
      const mapped = {
        ...member,
        memberships: sortedMemberships,
        currentMembership: mostRecent,
        hasMembership: true,
        hasPendingPayment: isPending,
      };
      return mapped;
    });

    return {
      data: mappedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<Member> {
    const member = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.id = :id', { id })
      .getOne();

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  async findByUserId(userId: string): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!member) {
      throw new NotFoundException('Member not found for this user');
    }

    return member;
  }

  async update(id: string, updateMemberDto: UpdateMemberDto): Promise<Member> {
    const member = await this.findById(id);

    Object.assign(member, updateMemberDto);

    return this.memberRepository.save(member);
  }

  async delete(id: string): Promise<void> {
    const member = await this.findById(id);
    await this.memberRepository.remove(member);
  }

  async search(query: string, page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    // Search in user email, firstName, lastName or member documentId
    const [data, total] = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('user.email ILIKE :query', { query: `%${query}%` })
      .orWhere('user.firstName ILIKE :query', { query: `%${query}%` })
      .orWhere('user.lastName ILIKE :query', { query: `%${query}%` })
      .orWhere('member.documentId ILIKE :query', { query: `%${query}%` })
      .skip(skip)
      .take(limit)
      .orderBy('member.createdAt', 'DESC')
      .getManyAndCount();

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

  async getPaidMembers(page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberRepository.findAndCount({
      where: { isPaid: true },
      relations: ['user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
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

  async getUnpaidMembers(page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberRepository.findAndCount({
      where: { isPaid: false },
      relations: ['user'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
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

  async getRecentMembers(days: number = 30): Promise<Member[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    return this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.user', 'user')
      .where('member.joinDate >= :date', { date })
      .orderBy('member.joinDate', 'DESC')
      .getMany();
  }
}
