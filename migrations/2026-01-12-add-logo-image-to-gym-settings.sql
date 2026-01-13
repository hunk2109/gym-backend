-- Add logo image column to gym_settings table
ALTER TABLE gym_settings ADD COLUMN logo_image LONGBLOB NULL AFTER membership_suspension_days;

-- Add comment
ALTER TABLE gym_settings MODIFY COLUMN logo_image LONGBLOB NULL COMMENT 'Logo/imagen para facturas (BLOB)';
