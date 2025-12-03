import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMembershipsService } from './group-memberships.service';
import {
  CreateGroupMembershipDto,
  UpdateGroupMembershipDto,
  AddMemberToGroupDto,
  GroupMembershipResponseDto,
} from './dto/group-membership.dto';

@Controller('group-memberships')
@UseGuards(JwtAuthGuard)
export class GroupMembershipsController {
  constructor(private groupMembershipsService: GroupMembershipsService) {}

  @Post()
  async create(
    @Body() dto: CreateGroupMembershipDto,
    @Req() req: any,
  ): Promise<{ data: GroupMembershipResponseDto }> {
    try {
      const data = await this.groupMembershipsService.create(dto, req.user.id);
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Get()
  async findAll(): Promise<{ data: GroupMembershipResponseDto[] }> {
    try {
      const data = await this.groupMembershipsService.findAll();
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<{ data: GroupMembershipResponseDto }> {
    try {
      const data = await this.groupMembershipsService.findOne(id);
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGroupMembershipDto,
  ): Promise<{ data: GroupMembershipResponseDto }> {
    try {
      const data = await this.groupMembershipsService.update(id, dto);
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    try {
      await this.groupMembershipsService.delete(id);
      return { message: 'Membresía grupal eliminada exitosamente' };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberToGroupDto,
  ): Promise<{ data: GroupMembershipResponseDto }> {
    try {
      const data = await this.groupMembershipsService.addMember(id, dto);
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<{ data: GroupMembershipResponseDto }> {
    try {
      const data = await this.groupMembershipsService.removeMember(id, userId);
      return { data };
    } catch (error) {
      throw error;
    }
  }

  @Get('member/:userId')
  async getGroupsByMember(@Param('userId') userId: string): Promise<{ data: GroupMembershipResponseDto[] }> {
    try {
      const data = await this.groupMembershipsService.getGroupsByMember(userId);
      return { data };
    } catch (error) {
      throw error;
    }
  }
}
