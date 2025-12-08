import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from '../../entities/coupon.entity';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private couponsRepository: Repository<Coupon>,
  ) {}

  async create(createCouponDto: CreateCouponDto) {
    const coupon = this.couponsRepository.create(createCouponDto);
    return await this.couponsRepository.save(coupon);
  }

  async findAll(filters?: { type?: string; isActive?: boolean }) {
    const query = this.couponsRepository.createQueryBuilder('coupon');

    if (filters?.type) {
      query.where('coupon.type = :type', { type: filters.type });
    }

    if (filters?.isActive !== undefined) {
      query.andWhere('coupon.isActive = :isActive', { isActive: filters.isActive });
    }

    return await query.orderBy('coupon.createdAt', 'DESC').getMany();
  }

  async findById(id: string) {
    return await this.couponsRepository.findOne({ where: { id } });
  }

  async findByCode(code: string) {
    return await this.couponsRepository.findOne({ where: { code } });
  }

  async getActiveBirthdayCoupons() {
    return await this.couponsRepository.find({
      where: {
        type: 'BIRTHDAY',
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, updateCouponDto: UpdateCouponDto) {
    await this.couponsRepository.update(id, updateCouponDto);
    return await this.findById(id);
  }

  async delete(id: string) {
    return await this.couponsRepository.delete(id);
  }

  async incrementUsageCount(id: string) {
    await this.couponsRepository.increment({ id }, 'usageCount', 1);
    return await this.findById(id);
  }

  async validateCoupon(code: string) {
    const coupon = await this.findByCode(code);

    if (!coupon) {
      return { valid: false, message: 'Cupón no encontrado' };
    }

    if (!coupon.isActive) {
      return { valid: false, message: 'Cupón inactivo' };
    }

    if (coupon.expiryDate && new Date() > new Date(coupon.expiryDate)) {
      return { valid: false, message: 'Cupón expirado' };
    }

    if (coupon.maxUsages && coupon.usageCount >= coupon.maxUsages) {
      return { valid: false, message: 'Cupón agotado' };
    }

    return { valid: true, coupon };
  }
}
