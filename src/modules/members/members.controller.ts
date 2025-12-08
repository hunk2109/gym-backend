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
  Logger,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipValidationService } from '../../services/membership-validation.service';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  private readonly logger = new Logger(MembersController.name);

  constructor(
    private readonly membersService: MembersService,
    private readonly membershipValidationService: MembershipValidationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    const result = await this.membersService.findAll(parseInt(page), parseInt(limit));
    
    // Asegurar que cada miembro tiene hasMembership y hasPendingPayment en la respuesta
    const enrichedData = result.data.map(member => {
      const plainMember = { ...member };
      // Asegurar que los campos booleanos están presentes
      if (!('hasMembership' in plainMember)) {
        plainMember.hasMembership = false;
      }
      if (!('hasPendingPayment' in plainMember)) {
        plainMember.hasPendingPayment = false;
      }
      console.log(`[MembersController] Miembro ${plainMember.id}: hasMembership=${plainMember.hasMembership}, hasPendingPayment=${plainMember.hasPendingPayment}`);
      return plainMember;
    });
    
    return {
      data: enrichedData,
      pagination: result.pagination,
    };
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.membersService.search(query, parseInt(page), parseInt(limit));
  }

  @Get('paid')
  @HttpCode(HttpStatus.OK)
  async getPaidMembers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.membersService.getPaidMembers(parseInt(page), parseInt(limit));
  }

  @Get('unpaid')
  @HttpCode(HttpStatus.OK)
  async getUnpaidMembers(@Query('page') page: string = '1', @Query('limit') limit: string = '10') {
    return this.membersService.getUnpaidMembers(parseInt(page), parseInt(limit));
  }

  @Get('recent')
  @HttpCode(HttpStatus.OK)
  async getRecentMembers(@Query('days') days: string = '30') {
    return this.membersService.getRecentMembers(parseInt(days));
  }

  @Get('membership/expired')
  @HttpCode(HttpStatus.OK)
  async getExpiredMembers() {
    const members = await this.membershipValidationService.getExpiredMembers();
    return {
      statusCode: 200,
      data: members,
      count: members.length,
      message: `Se encontraron ${members.length} miembros con membresía vencida`,
    };
  }

  @Get('membership/expiring/:days')
  @HttpCode(HttpStatus.OK)
  async getExpiringMembers(@Param('days') days: string) {
    const members = await this.membershipValidationService.getExpiringMembersInDays(parseInt(days) || 7);
    return {
      statusCode: 200,
      data: members,
      count: members.length,
      message: `Se encontraron ${members.length} miembros con membresía venciendo en ${days} días`,
    };
  }

  @Get(':id/membership-status')
  @HttpCode(HttpStatus.OK)
  async getMembershipStatus(@Param('id') memberId: string) {
    const status = await this.membershipValidationService.getMembershipStatus(memberId);
    return {
      statusCode: 200,
      data: status,
      message: status.isExpired ? '⚠️ Membresía vencida' : '✅ Membresía activa',
    };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.membersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createMemberDto: CreateMemberDto) {
    return this.membersService.create(createMemberDto);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return this.membersService.delete(id);
  }
}
