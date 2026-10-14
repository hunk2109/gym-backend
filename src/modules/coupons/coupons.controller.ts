import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';
import { Coupon } from '../../entities/coupon.entity';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  async create(@Body() createCouponDto: CreateCouponDto) {
    return await this.couponsService.create(createCouponDto);
  }

  @Get()
  async findAll(
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    const filters = {
      type: type || undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    };
    return await this.couponsService.findAll(filters);
  }

  @Get('birthday/active')
  async getActiveBirthdayCoupons() {
    return await this.couponsService.getActiveBirthdayCoupons();
  }

  @Get('validate/:code')
  async validateCoupon(@Param('code') code: string) {
    return await this.couponsService.validateCoupon(code);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.couponsService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCouponDto: UpdateCouponDto) {
    return await this.couponsService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return await this.couponsService.delete(id);
  }

  @Post(':id/increment-usage')
  async incrementUsageCount(@Param('id') id: string) {
    return await this.couponsService.incrementUsageCount(id);
  }

  @Get('test/debug-promotions')
  async debugPromotions() {
    try {
      const promotions = await this.couponsService.findAll({ isActive: true });
      return {
        message: 'Debug',
        count: promotions.length,
        promotions,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  @Post('test/create-birthday-coupons')
  async createBirthdayCoupons() {
    const coupons: CreateCouponDto[] = [
      {
        code: 'CUMPLE2025',
        description: '15% de descuento en tu cumpleaños',
        discountPercentage: 15,
        isActive: true,
        type: 'BIRTHDAY',
      },
      {
        code: 'FELIZ_DIA',
        description: '20% de descuento especial',
        discountPercentage: 20,
        isActive: true,
        type: 'BIRTHDAY',
      },
      {
        code: 'REGALO_CUMPLE',
        description: '25% de descuento en servicios',
        discountPercentage: 25,
        isActive: true,
        type: 'BIRTHDAY',
      },
    ];

    const created: Coupon[] = [];
    for (const coupon of coupons) {
      const result = await this.couponsService.create(coupon);
      created.push(result);
    }

    return {
      message: `${created.length} cupones de cumpleaños creados`,
      coupons: created,
    };
  }
}
