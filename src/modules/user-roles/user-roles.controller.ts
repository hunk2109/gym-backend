import { Controller, Post, Get, Body, Param, Query, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('user-roles')
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
    const requestingUserId = req.user?.userId || req.user?.sub || req.user?.id;
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
  async getActiveClients(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const clients = await this.userRolesService.getActiveClients(limitNum, search);
    
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

  // ================= PERMISOS DINÁMICOS =================

  @Get('permissions/catalog')
  async getPermissionsCatalog(@Req() req: any) {
    const catalog = this.userRolesService.getPermissionsCatalog();
    return {
      statusCode: 200,
      success: true,
      data: catalog,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('permissions/all')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getAllRolePermissions(@Req() req: any) {
    const permissions = await this.userRolesService.getAllRolePermissions();
    return {
      statusCode: 200,
      success: true,
      data: permissions,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('permissions/my-permissions')
  async getMyPermissions(@Req() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const permissions = await this.userRolesService.getUserPermissions(userId);
    return {
      statusCode: 200,
      success: true,
      data: permissions,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Get('permissions/:role')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getRolePermissions(@Param('role') role: string, @Req() req: any) {
    const permissions = await this.userRolesService.getPermissionsForRole(role);
    return {
      statusCode: 200,
      success: true,
      data: permissions,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  @Post('permissions/:role')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateRolePermissions(
    @Param('role') role: string,
    @Body('permissions') permissions: string[],
    @Req() req: any,
  ) {
    const requestingUserId = req.user?.userId || req.user?.sub || req.user?.id;
    const updated = await this.userRolesService.updateRolePermissions(
      role,
      permissions || [],
      requestingUserId,
    );
    return {
      statusCode: 200,
      success: true,
      message: `Permissions updated for role ${role}`,
      data: updated,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
  }

  // ================= OTROS ENDPOINTS =================

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
    const requestingUserId = req.user?.userId || req.user?.sub || req.user?.id;
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
