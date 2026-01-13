-- Remove paymentStatus column from member_memberships table
-- This data will now be calculated dynamically from the payments table
ALTER TABLE member_memberships DROP COLUMN paymentStatus;
