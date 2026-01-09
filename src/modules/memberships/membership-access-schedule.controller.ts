import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { MembershipAccessScheduleService } from './membership-access-schedule.service';
import { MembershipAccessSchedule } from '../../entities/membership-access-schedule.entity';
import {
  CreateMembershipAccessScheduleDto,
  UpdateMembershipAccessScheduleDto,
} from './dto/membership-access-schedule.dto';

@Controller('memberships/access-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MembershipAccessScheduleController {
  private readonly logger = new Logger(MembershipAccessScheduleController.name);

  constructor(
    private accessScheduleService: MembershipAccessScheduleService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async createSchedule(
    @Body() createScheduleDto: CreateMembershipAccessScheduleDto,
  ): Promise<MembershipAccessSchedule> {
    this.logger.log('[AccessScheduleController] POST /memberships/access-schedules');
    return this.accessScheduleService.createSchedule(createScheduleDto);
  }

  @Get('membership/:membershipId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getSchedulesByMembership(
    @Param('membershipId') membershipId: string,
  ): Promise<MembershipAccessSchedule[]> {
    this.logger.log(
      `[AccessScheduleController] GET /memberships/access-schedules/membership/${membershipId}`,
    );
    return this.accessScheduleService.getSchedulesByMembership(membershipId);
  }

  @Put(':scheduleId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateSchedule(
    @Param('scheduleId') scheduleId: string,
    @Body() updateScheduleDto: UpdateMembershipAccessScheduleDto,
  ): Promise<MembershipAccessSchedule> {
    this.logger.log(
      `[AccessScheduleController] PUT /memberships/access-schedules/${scheduleId}`,
    );
    return this.accessScheduleService.updateSchedule(scheduleId, updateScheduleDto);
  }

  @Delete(':scheduleId')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async deleteSchedule(
    @Param('scheduleId') scheduleId: string,
  ): Promise<{ message: string }> {
    this.logger.log(
      `[AccessScheduleController] DELETE /memberships/access-schedules/${scheduleId}`,
    );
    await this.accessScheduleService.deleteSchedule(scheduleId);
    return { message: 'Schedule deleted successfully' };
  }
}
