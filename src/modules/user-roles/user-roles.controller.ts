import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../../entities/user.entity';

@Controller('api/user-roles')
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post('assign/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @Req() req: any,
  ) {
    const requestingUserId = req.user.sub;
    const updatedUser = await this.userRolesService.assignRole(userId, role, requestingUserId);
    return {
      statusCode: 200,
      success: true,
      message: 'Role assigned successfully',
      data: updatedUser,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('clients')
  @UseGuards(JwtAuthGuard)
  async getActiveClients(@Req() req: any) {
    const clients = await this.userRolesService.getActiveClients();
    return {
      statusCode: 200,
      success: true,
      message: 'Active clients retrieved successfully',
      data: clients,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('by-role/:role')
  @UseGuards(JwtAuthGuard)
  async getUsersByRole(@Param('role') role: UserRole, @Req() req: any) {
    const users = await this.userRolesService.getUsersByRole(role);
    return {
      statusCode: 200,
      success: true,
      message: `Users with role ${role} retrieved successfully`,
      data: users,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Post('toggle-active/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleUserActive(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const requestingUserId = req.user.sub;
    const updatedUser = await this.userRolesService.toggleUserActive(userId, requestingUserId);
    return {
      statusCode: 200,
      success: true,
      message: 'User status toggled successfully',
      data: updatedUser,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }
}
