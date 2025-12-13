import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Table, TableStatus } from '../../entities/table.entity';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';

@Injectable()
export class TablesService {
  private readonly logger = new Logger(TablesService.name);

  constructor(
    @InjectRepository(Table)
    private tableRepository: Repository<Table>,
  ) {}

  async getAllTables(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [tables, total] = await this.tableRepository.findAndCount({
      relations: ['accounts', 'accounts.items', 'accounts.items.product'],
      skip,
      take: limit,
      order: { tableNumber: 'ASC' },
    });

    return {
      tables,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getTableById(id: string) {
    const table = await this.tableRepository.findOne({
      where: { id },
      relations: ['accounts', 'accounts.items', 'accounts.items.product'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${id} not found`);
    }

    return table;
  }

  async getTableByNumber(tableNumber: number) {
    const table = await this.tableRepository.findOne({
      where: { tableNumber },
      relations: ['accounts', 'accounts.items', 'accounts.items.product'],
    });

    if (!table) {
      throw new NotFoundException(`Table ${tableNumber} not found`);
    }

    return table;
  }

  async createTable(createTableDto: CreateTableDto) {
    // Verificar que el número de mesa no exista
    const existing = await this.tableRepository.findOne({
      where: { tableNumber: createTableDto.tableNumber },
    });

    if (existing) {
      throw new BadRequestException(
        `Table with number ${createTableDto.tableNumber} already exists`,
      );
    }

    const table = this.tableRepository.create({
      tableNumber: createTableDto.tableNumber,
      capacity: createTableDto.capacity,
      notes: createTableDto.notes,
      status: TableStatus.AVAILABLE,
    });

    const saved = await this.tableRepository.save(table);
    this.logger.log(`Table created: #${saved.tableNumber}`);

    return this.getTableById(saved.id);
  }

  async updateTable(id: string, updateTableDto: UpdateTableDto) {
    const table = await this.getTableById(id);

    Object.assign(table, updateTableDto);
    await this.tableRepository.save(table);

    this.logger.log(`Table updated: #${table.tableNumber}`);
    return this.getTableById(id);
  }

  async deleteTable(id: string) {
    const table = await this.getTableById(id);

    // Verificar que no tenga cuentas abiertas
    if (table.accounts && table.accounts.some((a) => a.status === 'open')) {
      throw new BadRequestException('Cannot delete table with open accounts');
    }

    await this.tableRepository.remove(table);
    this.logger.warn(`Table deleted: #${table.tableNumber}`);
  }

  async getAvailableTables() {
    return this.tableRepository.find({
      where: { status: TableStatus.AVAILABLE },
      order: { tableNumber: 'ASC' },
    });
  }

  async getOpenTables() {
    return this.tableRepository.find({
      where: { status: TableStatus.OPEN },
      relations: ['accounts', 'accounts.items'],
      order: { tableNumber: 'ASC' },
    });
  }

  async updateTableStatus(tableId: string, status: TableStatus) {
    await this.tableRepository.update(tableId, { status });
  }
}
