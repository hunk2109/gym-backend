import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/user-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Post('assign/:userId')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @Req() req: any,
  ) {
    const requestingUserId = req.user.sub;
    const updatedUser = await this.userRolesService.assignRole(userId, role, requestingUserId);
    
    const userData = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };
    
    return {
      statusCode: 200,
      success: true,
      message: 'Role assigned successfully',
      data: userData,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('clients')
  @Roles(UserRole.ADMIN)
  async getActiveClients(@Req() req: any) {
    const clients = await this.userRolesService.getActiveClients();
    
    // Mapear a objetos simples sin campos sensibles
    const clientsData = clients.map(client => ({
      id: client.id,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      phone: client.phone,
      role: client.role,
      isActive: client.isActive,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    }));
    
    return {
      statusCode: 200,
      success: true,
      message: 'Active clients retrieved successfully',
      data: clientsData,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('by-role/:role')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
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
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
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
