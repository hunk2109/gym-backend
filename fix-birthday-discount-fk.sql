-- Fix birthday discount foreign key constraint
-- Change from referencing coupons table to promotions table

ALTER TABLE gym_settings 
  DROP FOREIGN KEY FK_3b115407c8a07905aab3e026df4;

ALTER TABLE gym_settings 
  ADD CONSTRAINT FK_birthday_discount_promotion 
  FOREIGN KEY (birthdayDiscountCouponId) 
  REFERENCES promotions(id) 
  ON DELETE SET NULL;
