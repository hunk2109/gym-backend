import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Req,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('groups')
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async createGroup(
    @Body()
    body: {
      name: string;
      membershipId: string;
      responsibleUserId: string;
      startDate: string;
      endDate: string;
    },
    @Request() req,
  ) {
    try {
      const group = await this.groupsService.createGroup(
        body.name,
        body.membershipId,
        body.responsibleUserId,
        new Date(body.startDate),
        new Date(body.endDate),
      );
      return {
        success: true,
        data: group,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error creando grupo',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('my-groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async getMyGroups(@Req() req: any) {
    try {
      console.log(`[GroupsController] 📍 GET /api/groups/my-groups`);
      console.log(`[GroupsController] user.role: "${req.user?.role}"`);
      
      const groups = await this.groupsService.getAllActiveGroups();
      
      console.log(`[GroupsController] ✅ ${groups.length} grupos activos encontrados`);
      console.log(`[GroupsController] 📦 Retornando:`, JSON.stringify(groups));
      console.log(`[GroupsController] 📊 Type: ${Array.isArray(groups) ? 'Array' : typeof groups}`);
      
      // Retornar directamente el array (sin wrapper)
      // Asegurar que es un array puro
      const result = Array.isArray(groups) ? groups : [groups];
      console.log(`[GroupsController] ✅ FINAL result length: ${result.length}`);
      return result;
    } catch (error) {
      console.error(`[GroupsController] ❌ Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Error obteniendo grupos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':groupId')
  async getGroup(@Param('groupId') groupId: string) {
    try {
      console.log(`[GroupsController.getGroup] 🔍 Obteniendo grupo: ${groupId}`);
      const group = await this.groupsService.getGroupById(groupId);
      console.log(`[GroupsController.getGroup] ✅ Grupo encontrado: ${group.name}`);
      console.log(`[GroupsController.getGroup] 👥 Companions count: ${group.companions?.length ?? 0}`);
      if (group.companions && group.companions.length > 0) {
        console.log(`[GroupsController.getGroup] Companions:`, group.companions.map(c => ({
          id: c.id,
          memberId: c.memberId,
          relationship: c.relationship,
          status: c.status,
          member: c.member ? { id: c.member.id, userId: c.member.userId } : null,
        })));
      }
      return group;
    } catch (error) {
      throw new HttpException(
        error.message || 'Grupo no encontrado',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('member/:memberId/groups')
  async getMemberGroups(@Param('memberId') memberId: string) {
    try {
      console.log(`[GroupsController] 📍 GET /api/groups/member/${memberId}/groups`);
      console.log(`[GroupsController] memberId recibido: "${memberId}"`);
      
      const groups = await this.groupsService.getGroupsByMemberId(memberId);
      
      console.log(`[GroupsController] ✅ ${groups.length} grupos encontrados para memberId: ${memberId}`);
      groups.forEach((g, i) => {
        console.log(`[GroupsController]   Grupo ${i}: ${g.name} (id: ${g.id})`);
      });
      
      return {
        success: true,
        data: groups,
      };
    } catch (error) {
      console.error(`[GroupsController] ❌ Error: ${error.message}`);
      throw new HttpException(
        error.message || 'Error obteniendo grupos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: string;
    },
    @Request() req,
  ) {
    try {
      const group = await this.groupsService.updateGroup(
        groupId,
        body.name,
        body.description,
        body.status,
      );
      return {
        success: true,
        data: group,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error actualizando grupo',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':groupId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async deleteGroup(
    @Param('groupId') groupId: string,
    @Request() req,
  ) {
    try {
      const memberId = req.user.memberId;
      await this.groupsService.deleteGroup(groupId, memberId);
      return {
        success: true,
        message: 'Grupo eliminado exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error eliminando grupo',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':groupId/companions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async addCompanion(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      memberId?: string;
      relationship?: string;
    },
    @Request() req,
  ) {
    try {
      if (!body.memberId) {
        throw new BadRequestException('memberId es requerido');
      }

      if (!groupId) {
        throw new BadRequestException('groupId es requerido');
      }

      const companion = await this.groupsService.addCompanionToGroup(
        groupId,
        body.memberId,
        body.relationship || '',
        req.user.memberId,
        req.user.role,
      );

      // Retornar un DTO sin relaciones para evitar que TypeORM intente sincronizar
      return {
        success: true,
        data: {
          id: companion.id,
          groupId: companion.groupId,
          memberId: companion.memberId,
          relationship: companion.relationship,
          status: companion.status,
          createdAt: companion.createdAt,
          updatedAt: companion.updatedAt,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error agregando acompañante',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':groupId/companions/:companionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async removeCompanion(
    @Param('groupId') groupId: string,
    @Param('companionId') companionId: string,
    @Request() req,
  ) {
    try {
      await this.groupsService.removeCompanionFromGroup(
        groupId,
        companionId,
        req.user.memberId,
        req.user.role,
      );
      return {
        success: true,
        message: 'Acompañante eliminado exitosamente',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error eliminando acompañante',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':groupId/transfer-responsibility')
  async transferResponsibility(
    @Param('groupId') groupId: string,
    @Body()
    body: {
      newResponsibleUserId: string;
    },
    @Request() req,
  ) {
    try {
      const group = await this.groupsService.transferResponsibility(
        groupId,
        body.newResponsibleUserId,
        req.user.userId,
      );
      return {
        success: true,
        data: group,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error transfiriendo responsabilidad',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
