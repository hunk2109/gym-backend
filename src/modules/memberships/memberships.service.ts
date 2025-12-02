import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../entities/membership.entity';
import { MemberMembership } from '../../entities/member-membership.entity';
import { Member } from '../../entities/member.entity';
import { CreateMembershipDto, UpdateMembershipDto, AssignMembershipDto, RenewMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepository: Repository<Membership>,
    @InjectRepository(MemberMembership)
    private memberMembershipRepository: Repository<MemberMembership>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  // Membership CRUD
  async createMembership(createMembershipDto: CreateMembershipDto): Promise<Membership> {
    const membership = this.membershipRepository.create(createMembershipDto);
    return this.membershipRepository.save(membership);
  }

  async getAllMemberships(page: number = 1, limit: number = 10): Promise<{ data: Membership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.membershipRepository.findAndCount({
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

  async getMembershipById(id: string): Promise<Membership> {
    const membership = await this.membershipRepository.findOne({ where: { id } });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return membership;
  }

  async updateMembership(id: string, updateMembershipDto: UpdateMembershipDto): Promise<Membership> {
    const membership = await this.getMembershipById(id);

    Object.assign(membership, updateMembershipDto);

    return this.membershipRepository.save(membership);
  }

  async deleteMembership(id: string): Promise<void> {
    const membership = await this.getMembershipById(id);
    await this.membershipRepository.remove(membership);
  }

  async getActiveMemberships(): Promise<Membership[]> {
    return this.membershipRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  // Member Membership Operations
  async assignMembership(assignMembershipDto: AssignMembershipDto): Promise<MemberMembership> {
    const { memberId, membershipId, startDate, amountPaid, paymentDate } = assignMembershipDto;

    // Verify member exists
    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // Verify membership exists
    const membership = await this.membershipRepository.findOne({ where: { id: membershipId } });
    if (!membership) {
      throw new BadRequestException('Membership not found');
    }

    // Check if member already has active membership
    const activeMembership = await this.memberMembershipRepository.findOne({
      where: { memberId, isActive: true },
    });

    if (activeMembership) {
      throw new BadRequestException('Member already has an active membership');
    }

    const start = startDate || new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + membership.durationMonths);

    const memberMembership = this.memberMembershipRepository.create({
      memberId,
      membershipId,
      startDate: start,
      endDate: end,
      amountPaid,
      paymentDate,
      isActive: true,
    });

    return this.memberMembershipRepository.save(memberMembership);
  }

  async getMemberActiveMembership(memberId: string): Promise<MemberMembership> {
    const memberMembership = await this.memberMembershipRepository.findOne({
      where: { memberId, isActive: true },
      relations: ['membership', 'member'],
    });

    if (!memberMembership) {
      throw new NotFoundException('No active membership found for this member');
    }

    return memberMembership;
  }

  async renewMembership(membershipId: string, renewMembershipDto: RenewMembershipDto): Promise<MemberMembership> {
    const currentMembership = await this.memberMembershipRepository.findOne({
      where: { id: membershipId, isActive: true },
      relations: ['membership'],
    });

    if (!currentMembership) {
      throw new NotFoundException('Active membership not found');
    }

    // Deactivate current membership
    currentMembership.isActive = false;
    await this.memberMembershipRepository.save(currentMembership);

    // Create new membership
    const newStartDate = currentMembership.endDate;
    const newEndDate = new Date(newStartDate);
    newEndDate.setMonth(newEndDate.getMonth() + currentMembership.membership.durationMonths);

    const newMembership = this.memberMembershipRepository.create({
      memberId: currentMembership.memberId,
      membershipId: currentMembership.membershipId,
      startDate: newStartDate,
      endDate: newEndDate,
      amountPaid: renewMembershipDto.amountPaid,
      paymentDate: renewMembershipDto.paymentDate,
      isActive: true,
    });

    return this.memberMembershipRepository.save(newMembership);
  }

  async getMemberMembershipHistory(memberId: string, page: number = 1, limit: number = 10): Promise<{ data: MemberMembership[]; pagination: any }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.memberMembershipRepository.findAndCount({
      where: { memberId },
      relations: ['membership'],
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

  async checkMembershipExpiry(): Promise<MemberMembership[]> {
    const today = new Date();

    return this.memberMembershipRepository
      .createQueryBuilder('mm')
      .where('mm.endDate <= :today', { today })
      .andWhere('mm.isActive = true')
      .getMany();
  }
}
