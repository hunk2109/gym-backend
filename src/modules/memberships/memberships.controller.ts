import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto, UpdateMembershipDto, AssignMembershipDto, RenewMembershipDto } from './dto/create-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/memberships')
@UseGuards(JwtAuthGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // Membership endpoints
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllMemberships(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const result = await this.membershipsService.getAllMemberships(parseInt(page), parseInt(limit));
    console.log('[MembershipsController] GET /memberships - Retornando:', JSON.stringify(result, null, 2).substring(0, 200));
    return result;
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveMemberships() {
    return this.membershipsService.getActiveMemberships();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getMembershipById(@Param('id') id: string) {
    return this.membershipsService.getMembershipById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMembership(@Body() createMembershipDto: CreateMembershipDto) {
    return this.membershipsService.createMembership(createMembershipDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updateMembership(
    @Param('id') id: string,
    @Body() updateMembershipDto: UpdateMembershipDto,
  ) {
    return this.membershipsService.updateMembership(id, updateMembershipDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMembership(@Param('id') id: string) {
    return this.membershipsService.deleteMembership(id);
  }
}

@Controller('api/member-memberships')
@UseGuards(JwtAuthGuard)
export class MemberMembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // Member-Membership endpoints
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assignMembership(@Body() assignMembershipDto: AssignMembershipDto) {
    return this.membershipsService.assignMembership(assignMembershipDto);
  }

  @Get('member/:memberId')
  @HttpCode(HttpStatus.OK)
  async getMemberActiveMembership(@Param('memberId') memberId: string) {
    return this.membershipsService.getMemberActiveMembership(memberId);
  }

  @Get('history/:memberId')
  @HttpCode(HttpStatus.OK)
  async getMemberMembershipHistory(
    @Param('memberId') memberId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.membershipsService.getMemberMembershipHistory(memberId, parseInt(page), parseInt(limit));
  }

  @Post(':id/renew')
  @HttpCode(HttpStatus.OK)
  async renewMembership(
    @Param('id') id: string,
    @Body() renewMembershipDto: RenewMembershipDto,
  ) {
    return this.membershipsService.renewMembership(id, renewMembershipDto);
  }

  @Get('expiry/check')
  @HttpCode(HttpStatus.OK)
  async checkMembershipExpiry() {
    return this.membershipsService.checkMembershipExpiry();
  }
}
