import { Controller, Get, Put, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ModulesManagementService } from './modules-management.service';
import { UpdateModuleSettingsDto } from './dto/module-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleSettings } from '../../entities/module-settings.entity';

@Controller('api/modules-management')
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
      throw new Error('Only admins can toggle modules');
    }
    return this.modulesService.toggleModule(moduleName);
  }

  @Post('enable-all')
  async enableAll(@Req() req: any): Promise<ModuleSettings[]> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new Error('Only admins can enable all modules');
    }
    return this.modulesService.enableAllModules();
  }

  @Post('disable-all')
  async disableAll(@Req() req: any): Promise<ModuleSettings[]> {
    // Verificar que sea admin
    if (req.user.role !== 'admin') {
      throw new Error('Only admins can disable all modules');
    }
    return this.modulesService.disableAllModules();
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
      throw new Error('Only admins can update module settings');
    }
    return this.modulesService.updateModule(moduleName, updateDto);
  }
}
