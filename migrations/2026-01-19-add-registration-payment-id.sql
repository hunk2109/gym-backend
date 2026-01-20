-- Add registrationPaymentId column to members table
-- This column references the registration payment for each member

ALTER TABLE members ADD COLUMN registrationPaymentId VARCHAR(36) NULL;

-- Add index on registrationPaymentId for faster queries
CREATE INDEX idx_members_registrationPaymentId ON members(registrationPaymentId);
