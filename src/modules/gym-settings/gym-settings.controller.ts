import { Controller, Get, Post, Put, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { GymSettingsService } from './gym-settings.service';
import { CreateGymSettingsDto, UpdateGymSettingsDto } from './dto/gym-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/gym-settings')
export class GymSettingsController {
  constructor(private readonly gymSettingsService: GymSettingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateGymSettingsDto) {
    return this.gymSettingsService.create(createDto);
  }

  @Get()
  async getSettings() {
    return this.gymSettingsService.getSettings();
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async update(@Body() updateDto: UpdateGymSettingsDto) {
    return this.gymSettingsService.update(updateDto);
  }
}
