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
  Req,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto/create-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MembershipValidationService } from '../../services/membership-validation.service';
import { PaymentMethod } from '../../entities/payment.entity';

@Controller('members')
export class MembersController {
  private readonly logger = new Logger(MembersController.name);

  constructor(
    private readonly membersService: MembersService,
    private readonly membershipValidationService: MembershipValidationService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('page') page: string = '1', @Query('limit') limit: string = '20') {
    const result = await this.membersService.findAll(parseInt(page), parseInt(limit));
    
    return {
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get('search')
  @HttpCode(HttpStatus.OK)
  async search(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '500',
  ) {
    return this.membersService.search(query, parseInt(page), parseInt(limit));
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

  /**
   * Obtiene el estado del pago de inscripción de un miembro
   * GET /members/:id/registration-payment-status
   */
  @Get(':id/registration-payment-status')
  @HttpCode(HttpStatus.OK)
  async getRegistrationPaymentStatus(@Param('id') memberId: string) {
    const status = await this.membersService.getRegistrationPaymentStatus(memberId);
    return { statusCode: 200, data: status };
  }

  /**
   * Obtiene si hay pago de membresía pendiente para un miembro
   * GET /members/:id/membership-payment-status
   */
  @Get(':id/membership-payment-status')
  @HttpCode(HttpStatus.OK)
  async hasMembershipPaymentPending(@Param('id') memberId: string) {
    const status = await this.membersService.hasMembershipPaymentPending(memberId);
    return { statusCode: 200, data: status };
  }

  @Get(':id/debug-payment-status')
  @HttpCode(HttpStatus.OK)
  async debugPaymentStatus(@Param('id') memberId: string) {
    // Endpoint de DEBUG para diagnosticar el problema de pagos de membresía
    console.log(`[MembersController] 🔍 DEBUG: Obteniendo estado de pago de miembro: ${memberId}`);
    const result = await this.membersService.debugPaymentStatus(memberId);
    return { statusCode: 200, data: result };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(@Param('id') id: string) {
    return this.membersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(@Body() createMemberDto: CreateMemberDto, @Req() req: any) {
    const userId = req.user?.userId;
    return this.membersService.create(createMemberDto, userId);
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

  @Post(':id/remove-memberships')
  @HttpCode(HttpStatus.OK)
  async removeMemberships(@Param('id') id: string) {
    return this.membersService.removeMemberships(id);
  }

  @Post(':id/credit')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async addCredit(
    @Param('id') id: string,
    @Body() body: { amount: number; paymentMethod: PaymentMethod; notes?: string },
    @Req() req: any
  ) {
    const userId = req.user?.userId;
    return this.membersService.addCredit(
      id,
      body.amount,
      body.paymentMethod,
      body.notes,
      userId
    );
  }
}
