import { Controller, Get, Put, Post, Param, Body, UseGuards, Req, ForbiddenException, NotFoundException, Query } from '@nestjs/common';
import { ModulesManagementService } from './modules-management.service';
import { UpdateModuleSettingsDto } from './dto/module-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleSettings } from '../../entities/module-settings.entity';

@Controller('modules-management')
@UseGuards(JwtAuthGuard)
export class ModulesManagementController {
  constructor(private readonly modulesService: ModulesManagementService) {}

  @Get()
  async getAllModules(): Promise<ModuleSettings[]> {
    return this.modulesService.getAllModules();
  }

  @Post('toggle/:moduleName')
  async toggleModule(
    @Param('moduleName') moduleName: string,
    @Req() req: any,
  ): Promise<ModuleSettings> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can toggle modules');
    }
    return this.modulesService.toggleModule(moduleName);
  }

  @Post('enable-all')
  async enableAll(@Req() req: any): Promise<ModuleSettings[]> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can enable all modules');
    }
    return this.modulesService.enableAllModules();
  }

  @Post('disable-all')
  async disableAll(@Req() req: any): Promise<ModuleSettings[]> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can disable all modules');
    }
    return this.modulesService.disableAllModules();
  }

  @Get('settings/:moduleName/:settingKey')
  async getModuleSetting(
    @Param('moduleName') moduleName: string,
    @Param('settingKey') settingKey: string,
  ): Promise<any> {
    return this.modulesService.getModuleSetting(moduleName, settingKey);
  }

  @Put('settings/:moduleName/:settingKey')
  async updateModuleSetting(
    @Param('moduleName') moduleName: string,
    @Param('settingKey') settingKey: string,
    @Body() body: { value: any },
    @Req() req: any,
  ): Promise<ModuleSettings> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update module settings');
    }
    return this.modulesService.updateModuleSetting(moduleName, settingKey, body.value);
  }

  @Get(':moduleName')
  async getModule(@Param('moduleName') moduleName: string): Promise<ModuleSettings | null> {
    return this.modulesService.getModule(moduleName);
  }

  @Put(':moduleName')
  async updateModule(
    @Param('moduleName') moduleName: string,
    @Body() updateDto: UpdateModuleSettingsDto,
    @Req() req: any,
  ): Promise<ModuleSettings> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new ForbiddenException('Only admins can update module settings');
    }
    return this.modulesService.updateModule(moduleName, updateDto);
  }
}
