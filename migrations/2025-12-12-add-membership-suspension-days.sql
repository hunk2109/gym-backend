-- Add membershipSuspensionDays field to gym_settings table
ALTER TABLE gym_settings 
  ADD COLUMN membershipSuspensionDays INT DEFAULT 15 NOT NULL;

-- Update description
ALTER TABLE gym_settings 
  MODIFY COLUMN membershipSuspensionDays INT DEFAULT 15 COMMENT 'Días para suspender membresía con pago pendiente';
