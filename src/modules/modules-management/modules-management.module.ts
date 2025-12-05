import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleSettings } from '../../entities/module-settings.entity';
import { ModulesManagementService } from './modules-management.service';
import { ModulesManagementController } from './modules-management.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleSettings])],
  controllers: [ModulesManagementController],
  providers: [ModulesManagementService],
  exports: [ModulesManagementService],
})
export class ModulesManagementModule implements OnModuleInit {
  constructor(private modulesService: ModulesManagementService) {}

  async onModuleInit() {
    // Inicializar módulos por defecto en la base de datos
    await this.modulesService.initializeModules();
  }
}
