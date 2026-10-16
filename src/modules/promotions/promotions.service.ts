import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity';
import { CreatePromotionDto, UpdatePromotionDto, ValidatePromotionDto, PromotionResponseDto } from './dtos/promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionsRepository: Repository<Promotion>,
  ) {}

  async create(createPromotionDto: CreatePromotionDto): Promise<PromotionResponseDto> {
    // Verificar que el código no exista
    const existing = await this.promotionsRepository.findOne({
      where: { code: createPromotionDto.code.toUpperCase() },
    });

    if (existing) {
      throw new BadRequestException(`El código de promoción "${createPromotionDto.code}" ya existe`);
    }

    const promotion = this.promotionsRepository.create({
      ...createPromotionDto,
      code: createPromotionDto.code.toUpperCase(),
    });

    const saved = await this.promotionsRepository.save(promotion);
    return this.mapToResponse(saved);
  }

  async findAll(): Promise<PromotionResponseDto[]> {
    const promotions = await this.promotionsRepository.find({
      order: { createdAt: 'DESC' },
    });
    return promotions.map(p => this.mapToResponse(p));
  }

  async findActive(): Promise<PromotionResponseDto[]> {
    const promotions = await this.promotionsRepository.find({
      where: { active: true },
      order: { createdAt: 'DESC' },
    });
    return promotions.map(p => this.mapToResponse(p));
  }

  async findOne(id: string): Promise<PromotionResponseDto> {
    const promotion = await this.promotionsRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con ID "${id}" no encontrada`);
    }
    return this.mapToResponse(promotion);
  }

  async update(id: string, updatePromotionDto: UpdatePromotionDto): Promise<PromotionResponseDto> {
    const promotion = await this.promotionsRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con ID "${id}" no encontrada`);
    }

    // Si está cambiando el código, verificar que no exista otro con ese código
    if (updatePromotionDto.code && updatePromotionDto.code !== promotion.code) {
      const existing = await this.promotionsRepository.findOne({
        where: { code: updatePromotionDto.code.toUpperCase() },
      });
      if (existing) {
        throw new BadRequestException(`El código de promoción "${updatePromotionDto.code}" ya existe`);
      }
      updatePromotionDto.code = updatePromotionDto.code.toUpperCase();
    }

    Object.assign(promotion, updatePromotionDto);
    const updated = await this.promotionsRepository.save(promotion);
    return this.mapToResponse(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const promotion = await this.promotionsRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con ID "${id}" no encontrada`);
    }

    await this.promotionsRepository.remove(promotion);
    return { message: 'Promoción eliminada exitosamente' };
  }

  async validatePromoCode(validateDto: ValidatePromotionDto): Promise<{ valid: boolean; discount: number; message: string }> {
    const promotion = await this.promotionsRepository.findOne({
      where: { code: validateDto.code.toUpperCase() },
    });

    if (!promotion) {
      return { valid: false, discount: 0, message: 'Código de promoción no encontrado' };
    }

    if (!promotion.active) {
      return { valid: false, discount: 0, message: 'Código de promoción inactivo' };
    }

    if (promotion.expiresAt) {
      const expiry = new Date(promotion.expiresAt);
      if (expiry.getHours() === 0 && expiry.getMinutes() === 0 && expiry.getSeconds() === 0) {
        expiry.setHours(23, 59, 59, 999);
      }
      if (new Date() > expiry) {
        return { valid: false, discount: 0, message: 'Código de promoción expirado' };
      }
    }

    // Validar máximo de usos
    console.log(`[PromotionsService] Validando ${promotion.code}: maxUses=${promotion.maxUses}, usesCount=${promotion.usesCount}`);
    if (promotion.maxUses && promotion.usesCount >= promotion.maxUses) {
      console.log(`[PromotionsService] ❌ Cupón agotado: ${promotion.code}`);
      return { valid: false, discount: 0, message: 'Código de promoción alcanzó el máximo de usos' };
    }

    if (promotion.capturesBirthday && !validateDto.birthDate) {
      return { valid: false, discount: 0, message: 'Este código requiere fecha de nacimiento' };
    }

    console.log(`[PromotionsService] ✅ Cupón válido: ${promotion.code} - Descuento: ${promotion.discountPercentage}%`);
    return { 
      valid: true, 
      discount: promotion.discountPercentage,
      message: `Descuento válido: ${promotion.discountPercentage}%` 
    };
  }

  async applyPromotion(code: string): Promise<void> {
    const promotion = await this.promotionsRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    console.log(`[PromotionsService.applyPromotion] Verificando ${code}: maxUses=${promotion?.maxUses}, usesCount=${promotion?.usesCount}`);
    if (promotion && (!promotion.maxUses || promotion.usesCount < promotion.maxUses)) {
      promotion.usesCount += 1;
      await this.promotionsRepository.save(promotion);
      console.log(`[PromotionsService.applyPromotion] ✓ Incrementado ${code} a usesCount=${promotion.usesCount}`);
    } else {
      console.log(`[PromotionsService.applyPromotion] ❌ No se pudo aplicar ${code} - Cupón agotado o no encontrado`);
    }
  }

  async toggleActive(id: string): Promise<PromotionResponseDto> {
    const promotion = await this.promotionsRepository.findOne({ where: { id } });
    if (!promotion) {
      throw new NotFoundException(`Promoción con ID "${id}" no encontrada`);
    }

    promotion.active = !promotion.active;
    const updated = await this.promotionsRepository.save(promotion);
    return this.mapToResponse(updated);
  }

  private mapToResponse(promotion: Promotion): PromotionResponseDto {
    const now = new Date();
    let isExpired = false;
    if (promotion.expiresAt) {
      const expiry = new Date(promotion.expiresAt);
      if (expiry.getHours() === 0 && expiry.getMinutes() === 0 && expiry.getSeconds() === 0) {
        expiry.setHours(23, 59, 59, 999);
      }
      isExpired = now > expiry;
    }
    const isMaxUsesReached = promotion.maxUses && promotion.usesCount >= promotion.maxUses;

    return {
      id: promotion.id,
      code: promotion.code,
      discountPercentage: promotion.discountPercentage,
      description: promotion.description,
      capturesBirthday: promotion.capturesBirthday,
      maxUses: promotion.maxUses,
      usesCount: promotion.usesCount,
      active: promotion.active,
      createdAt: promotion.createdAt,
      expiresAt: promotion.expiresAt,
      isValid: promotion.active && !isExpired && !isMaxUsesReached,
      remainingUses: promotion.maxUses ? Math.max(0, promotion.maxUses - promotion.usesCount) : undefined,
    };
  }
}
