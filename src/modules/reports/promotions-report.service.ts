import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Sale } from '../../entities/sale.entity';
import { Member } from '../../entities/member.entity';

@Injectable()
export class PromotionsReportService {
  constructor(
    @InjectRepository(Promotion)
    private promotionsRepository: Repository<Promotion>,
    @InjectRepository(Sale)
    private salesRepository: Repository<Sale>,
    @InjectRepository(Member)
    private membersRepository: Repository<Member>,
  ) {}

  async getPromotionsReport(startDate?: Date, endDate?: Date) {
    const query = this.promotionsRepository.createQueryBuilder('promotion');

    if (startDate && endDate) {
      query.where('promotion.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const promotions = await query.orderBy('promotion.usesCount', 'DESC').getMany();

    return promotions.map(p => ({
      id: p.id,
      code: p.code,
      discountPercentage: p.discountPercentage,
      description: p.description,
      capturesBirthday: p.capturesBirthday,
      maxUses: p.maxUses,
      usesCount: p.usesCount,
      usagePercentage: p.maxUses ? ((p.usesCount / p.maxUses) * 100).toFixed(2) : 'Sin límite',
      active: p.active,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      isExpired: p.expiresAt && new Date() > p.expiresAt,
    }));
  }

  async getDiscountsSummary(startDate?: Date, endDate?: Date) {
    const query = this.promotionsRepository.createQueryBuilder('promotion');

    if (startDate && endDate) {
      query.where('promotion.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const promotions = await query.getMany();

    const totalDiscounts = promotions.reduce((sum, p) => sum + p.usesCount, 0);
    const topPromotion = promotions.length > 0 ? promotions.reduce((max, p) => (p.usesCount > max.usesCount ? p : max)) : null;

    return {
      totalPromotions: promotions.length,
      activePromotions: promotions.filter(p => p.active).length,
      totalDiscountsApplied: totalDiscounts,
      topPromotion: topPromotion ? {
        code: topPromotion.code,
        uses: topPromotion.usesCount,
      } : null,
      promotions: promotions.map(p => ({
        code: p.code,
        uses: p.usesCount,
      })),
    };
  }

  async getPromotionsByPopularity() {
    const promotions = await this.promotionsRepository
      .createQueryBuilder('promotion')
      .orderBy('promotion.usesCount', 'DESC')
      .limit(10)
      .getMany();

    return promotions.map(p => ({
      code: p.code,
      description: p.description,
      discountPercentage: p.discountPercentage,
      usesCount: p.usesCount,
      maxUses: p.maxUses,
      remainingUses: p.maxUses ? p.maxUses - p.usesCount : null,
    }));
  }

  async getExpiringPromotions(daysThreshold: number = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const promotions = await this.promotionsRepository
      .createQueryBuilder('promotion')
      .where('promotion.expiresAt IS NOT NULL')
      .andWhere('promotion.expiresAt <= :futureDate', { futureDate })
      .andWhere('promotion.expiresAt > :now', { now: new Date() })
      .andWhere('promotion.active = true')
      .orderBy('promotion.expiresAt', 'ASC')
      .getMany();

    return promotions.map(p => ({
      code: p.code,
      description: p.description,
      expiresAt: p.expiresAt,
      daysUntilExpiry: Math.ceil((p.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }

  async getExpiredPromotions() {
    const promotions = await this.promotionsRepository
      .createQueryBuilder('promotion')
      .where('promotion.expiresAt IS NOT NULL')
      .andWhere('promotion.expiresAt <= :now', { now: new Date() })
      .orderBy('promotion.expiresAt', 'DESC')
      .getMany();

    return promotions.map(p => ({
      code: p.code,
      description: p.description,
      expiresAt: p.expiresAt,
      usesCount: p.usesCount,
    }));
  }
}
