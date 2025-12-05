import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModuleSettings } from '../../entities/module-settings.entity';
import { UpdateModuleSettingsDto } from './dto/module-settings.dto';

@Injectable()
export class ModulesManagementService {
  private readonly logger = new Logger('ModulesManagementService');

  private readonly DEFAULT_MODULES = [
    { moduleName: 'inventory', description: 'Gestión de Inventario' },
    { moduleName: 'sales', description: 'Gestión de Ventas' },
    { moduleName: 'memberships', description: 'Gestión de Membresías' },
    { moduleName: 'employees', description: 'Gestión de Empleados' },
    { moduleName: 'dashboard', description: 'Dashboard Principal' },
    { moduleName: 'reports', description: 'Reportes' },
    { moduleName: 'payments', description: 'Gestión de Pagos' },
    { moduleName: 'audit_logs', description: 'Registros de Auditoría' },
  ];

  constructor(
    @InjectRepository(ModuleSettings)
    private moduleSettingsRepository: Repository<ModuleSettings>,
  ) {}

  async initializeModules(): Promise<void> {
    const count = await this.moduleSettingsRepository.count();
    
    if (count === 0) {
      this.logger.log('Inicializando módulos por defecto...');
      
      const modules = this.DEFAULT_MODULES.map(module =>
        this.moduleSettingsRepository.create({
          ...module,
          isEnabled: true,
        }),
      );

      await this.moduleSettingsRepository.save(modules);
      this.logger.log('Módulos inicializados correctamente');
    }
  }

  async getAllModules(): Promise<ModuleSettings[]> {
    return this.moduleSettingsRepository.find({
      order: { moduleName: 'ASC' },
    });
  }

  async getModule(moduleName: string): Promise<ModuleSettings | null> {
    return this.moduleSettingsRepository.findOne({
      where: { moduleName },
    });
  }

  async updateModule(moduleName: string, updateDto: UpdateModuleSettingsDto): Promise<ModuleSettings> {
    const module = await this.getModule(moduleName);
    
    if (!module) {
      throw new NotFoundException(`Module ${moduleName} not found`);
    }

    Object.assign(module, updateDto);
    return this.moduleSettingsRepository.save(module);
  }

  async toggleModule(moduleName: string): Promise<ModuleSettings> {
    const module = await this.getModule(moduleName);
    
    if (!module) {
      throw new NotFoundException(`Module ${moduleName} not found`);
    }

    module.isEnabled = !module.isEnabled;
    this.logger.log(`Module ${moduleName} toggled to ${module.isEnabled}`);
    
    return this.moduleSettingsRepository.save(module);
  }

  async enableAllModules(): Promise<ModuleSettings[]> {
    try {
      // Obtener todos los módulos primero
      const allModules = await this.getAllModules();
      
      // Actualizar cada uno
      for (const module of allModules) {
        module.isEnabled = true;
        await this.moduleSettingsRepository.save(module);
      }
      
      this.logger.log('All modules enabled');
      return this.getAllModules();
    } catch (error) {
      this.logger.error(`Error enabling all modules: ${error.message}`);
      throw new BadRequestException('Error enabling all modules');
    }
  }

  async disableAllModules(): Promise<ModuleSettings[]> {
    try {
      // Obtener todos los módulos primero
      const allModules = await this.getAllModules();
      
      // Actualizar cada uno
      for (const module of allModules) {
        module.isEnabled = false;
        await this.moduleSettingsRepository.save(module);
      }
      
      this.logger.log('All modules disabled');
      return this.getAllModules();
    } catch (error) {
      this.logger.error(`Error disabling all modules: ${error.message}`);
      throw new BadRequestException('Error disabling all modules');
    }
  }
}
