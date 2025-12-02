import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
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
      ...createMemberDto,
      joinDate: createMemberDto.joinDate || new Date(),
    });

    return this.memberRepository.save(member);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: Member[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberRepository.findAndCount({
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

  async findById(id: string): Promise<Member> {
    const member = await this.memberRepository.findOne({
      where: { id },
      relations: ['user'],
    });

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
