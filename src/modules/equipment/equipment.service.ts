import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Equipment } from '../../entities/equipment.entity';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  UpdateEquipmentStatusDto,
} from './dto/create-equipment.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private equipmentRepository: Repository<Equipment>,
  ) {}

  async getAllEquipment(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [equipment, total] = await this.equipmentRepository.findAndCount({
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    console.log('[EquipmentService] getAllEquipment - found equipment:', equipment.length, 'total:', total);
    return {
      equipment,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async getEquipmentById(id: string) {
    const equipment = await this.equipmentRepository.findOne({
      where: { id },
    });
    if (!equipment) {
      throw new NotFoundException(`Equipment ${id} not found`);
    }
    return equipment;
  }

  async createEquipment(createEquipmentDto: CreateEquipmentDto) {
    const equipment = new Equipment();
    equipment.name = createEquipmentDto.name;
    equipment.description = createEquipmentDto.description;
    equipment.category = createEquipmentDto.category;
    equipment.quantity = createEquipmentDto.quantity;
    equipment.quantityAvailable = createEquipmentDto.quantity;
    equipment.purchasePrice = createEquipmentDto.purchasePrice;
    equipment.purchaseDate = new Date(createEquipmentDto.purchaseDate);
    equipment.lastMaintenance = createEquipmentDto.lastMaintenance
      ? new Date(createEquipmentDto.lastMaintenance)
      : null;
    equipment.nextMaintenance = createEquipmentDto.nextMaintenance
      ? new Date(createEquipmentDto.nextMaintenance)
      : null;
    equipment.location = createEquipmentDto.location || null;
    equipment.imageUrl = createEquipmentDto.imageUrl || null;
    equipment.status = 'good';
    
    return this.equipmentRepository.save(equipment);
  }

  async updateEquipment(id: string, updateEquipmentDto: UpdateEquipmentDto) {
    const equipment = await this.getEquipmentById(id);
    
    if (updateEquipmentDto.name) equipment.name = updateEquipmentDto.name;
    if (updateEquipmentDto.description) equipment.description = updateEquipmentDto.description;
    if (updateEquipmentDto.category) equipment.category = updateEquipmentDto.category;
    if (updateEquipmentDto.quantity) equipment.quantity = updateEquipmentDto.quantity;
    if (updateEquipmentDto.quantityAvailable !== undefined) equipment.quantityAvailable = updateEquipmentDto.quantityAvailable;
    if (updateEquipmentDto.purchasePrice) equipment.purchasePrice = updateEquipmentDto.purchasePrice;
    if (updateEquipmentDto.location) equipment.location = updateEquipmentDto.location;
    if (updateEquipmentDto.status) equipment.status = updateEquipmentDto.status;
    if (updateEquipmentDto.imageUrl) equipment.imageUrl = updateEquipmentDto.imageUrl;
    if (updateEquipmentDto.lastMaintenance) {
      equipment.lastMaintenance = new Date(updateEquipmentDto.lastMaintenance);
    }
    if (updateEquipmentDto.nextMaintenance) {
      equipment.nextMaintenance = new Date(updateEquipmentDto.nextMaintenance);
    }

    return this.equipmentRepository.save(equipment);
  }

  async deleteEquipment(id: string) {
    const equipment = await this.getEquipmentById(id);
    await this.equipmentRepository.remove(equipment);
  }

  async getEquipmentByCategory(category: string) {
    return this.equipmentRepository.find({
      where: { category },
      order: { createdAt: 'DESC' },
    });
  }

  async getEquipmentNeedingMaintenance() {
    return this.equipmentRepository
      .createQueryBuilder('equipment')
      .where('equipment.status = :status', { status: 'maintenance_needed' })
      .orWhere('equipment.nextMaintenance < :now', { now: new Date() })
      .orderBy('equipment.nextMaintenance', 'ASC')
      .getMany();
  }

  async updateEquipmentStatus(
    id: string,
    updateStatusDto: UpdateEquipmentStatusDto,
  ) {
    const equipment = await this.getEquipmentById(id);
    equipment.status = updateStatusDto.status;
    
    // Si se marca como en mantenimiento, registrar la fecha
    if (updateStatusDto.status === 'maintenance_needed') {
      equipment.lastMaintenance = new Date();
      // Si no hay próximo mantenimiento, establecer uno por defecto (30 días después)
      if (!equipment.nextMaintenance) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 30);
        equipment.nextMaintenance = nextDate;
      }
    }

    return this.equipmentRepository.save(equipment);
  }

  async searchEquipment(query: string) {
    return this.equipmentRepository
      .createQueryBuilder('equipment')
      .where('LOWER(equipment.name) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .orWhere('LOWER(equipment.description) LIKE LOWER(:query)', {
        query: `%${query}%`,
      })
      .getMany();
  }

  async getEquipmentByLocation(location: string) {
    return this.equipmentRepository.find({
      where: { location },
      order: { createdAt: 'DESC' },
    });
  }

  async updateMaintenanceDate(id: string, nextMaintenanceDate: Date) {
    const equipment = await this.getEquipmentById(id);
    equipment.nextMaintenance = nextMaintenanceDate;
    return this.equipmentRepository.save(equipment);
  }

  async getEquipmentStatus() {
    const total = await this.equipmentRepository.count();
    const good = await this.equipmentRepository.count({
      where: { status: 'good' },
    });
    const needsMaintenance = await this.equipmentRepository.count({
      where: { status: 'maintenance_needed' },
    });
    const broken = await this.equipmentRepository.count({
      where: { status: 'broken' },
    });

    return {
      total,
      good,
      needsMaintenance,
      broken,
      healthPercentage: Math.round((good / total) * 100),
    };
  }
}
