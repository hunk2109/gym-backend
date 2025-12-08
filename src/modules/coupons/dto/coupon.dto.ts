export class CreateCouponDto {
  code: string;
  description?: string;
  discountPercentage: number;
  isActive?: boolean;
  maxUsages?: number;
  expiryDate?: Date;
  type?: 'GENERAL' | 'BIRTHDAY' | 'MEMBERSHIP' | 'PROMOTION';
}

export class UpdateCouponDto {
  code?: string;
  description?: string;
  discountPercentage?: number;
  isActive?: boolean;
  maxUsages?: number;
  expiryDate?: Date;
  type?: 'GENERAL' | 'BIRTHDAY' | 'MEMBERSHIP' | 'PROMOTION';
}

export class BirthdayDiscountSettingsDto {
  birthdayDiscountEnabled: boolean;
  birthdayDiscountCouponId?: string;
}
