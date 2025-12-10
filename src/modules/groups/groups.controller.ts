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
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Post()
  async createGroup(
    @Body()
    body: {
      name: string;
      membershipId: string;
      responsibleMemberId: string;
      startDate: string;
      endDate: string;
    },
    @Request() req,
  ) {
    try {
      const group = await this.groupsService.createGroup(
        body.name,
        body.membershipId,
        body.responsibleMemberId,
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

  @Get(':groupId')
  async getGroup(@Param('groupId') groupId: string) {
    try {
      const group = await this.groupsService.getGroupById(groupId);
      return {
        success: true,
        data: group,
      };
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
      const groups = await this.groupsService.getGroupsByMemberId(memberId);
      return {
        success: true,
        data: groups,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error obteniendo grupos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put(':groupId')
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

      const companion = await this.groupsService.addCompanionToGroup(
        groupId,
        body.memberId,
        body.relationship || '',
        req.user.memberId,
      );
      return {
        success: true,
        data: companion,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error agregando acompañante',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':groupId/companions/:companionId')
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
      newResponsibleMemberId: string;
    },
    @Request() req,
  ) {
    try {
      const group = await this.groupsService.transferResponsibility(
        groupId,
        body.newResponsibleMemberId,
        req.user.memberId,
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
