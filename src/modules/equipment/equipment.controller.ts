import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
} from './dto/create-equipment.dto';
import { EquipmentService } from './equipment.service';

@Controller('api/equipment')
@UseGuards(JwtAuthGuard)
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Get()
  async getAllEquipment(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.equipmentService.getAllEquipment(page, limit);
  }

  @Get('category/:category')
  async getEquipmentByCategory(@Param('category') category: string) {
    return this.equipmentService.getEquipmentByCategory(category);
  }

  @Get('location/:location')
  async getEquipmentByLocation(@Param('location') location: string) {
    return this.equipmentService.getEquipmentByLocation(location);
  }

  @Get('maintenance-needed')
  async getEquipmentNeedingMaintenance() {
    return this.equipmentService.getEquipmentNeedingMaintenance();
  }

  @Get('search')
  async searchEquipment(@Query('query') query: string) {
    return this.equipmentService.searchEquipment(query);
  }

  @Get('status/overview')
  async getEquipmentStatus() {
    return this.equipmentService.getEquipmentStatus();
  }

  @Get(':id')
  async getEquipmentById(@Param('id') id: string) {
    return this.equipmentService.getEquipmentById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEquipment(@Body() createEquipmentDto: CreateEquipmentDto) {
    return this.equipmentService.createEquipment(createEquipmentDto);
  }

  @Put(':id')
  async updateEquipment(
    @Param('id') id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
  ) {
    return this.equipmentService.updateEquipment(id, updateEquipmentDto);
  }

  @Patch(':id/status')
  async updateEquipmentStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateEquipmentStatusDto,
  ) {
    return this.equipmentService.updateEquipmentStatus(id, updateStatusDto);
  }

  @Patch(':id/maintenance')
  async updateMaintenanceDate(
    @Param('id') id: string,
    @Body('nextMaintenanceDate') nextMaintenanceDate: string,
  ) {
    return this.equipmentService.updateMaintenanceDate(
      id,
      new Date(nextMaintenanceDate),
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEquipment(@Param('id') id: string) {
    return this.equipmentService.deleteEquipment(id);
  }
}
