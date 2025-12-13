import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { TablesService } from './tables.service';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';

@Controller('tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAllTables(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.tablesService.getAllTables(page, limit);
  }

  @Get('available')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getAvailableTables() {
    return this.tablesService.getAvailableTables();
  }

  @Get('open')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getOpenTables() {
    return this.tablesService.getOpenTables();
  }

  @Get('number/:tableNumber')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getTableByNumber(@Param('tableNumber') tableNumber: string) {
    return this.tablesService.getTableByNumber(parseInt(tableNumber));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO, UserRole.EMPLEADO_CAJERO)
  async getTableById(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async createTable(@Body() createTableDto: CreateTableDto) {
    return this.tablesService.createTable(createTableDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async updateTable(@Param('id') id: string, @Body() updateTableDto: UpdateTableDto) {
    return this.tablesService.updateTable(id, updateTableDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ENCARGADO)
  async deleteTable(@Param('id') id: string) {
    await this.tablesService.deleteTable(id);
    return { message: 'Table deleted successfully' };
  }
}
