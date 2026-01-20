-- Add pricePerCompanion column to memberships table
ALTER TABLE memberships 
ADD COLUMN pricePerCompanion DECIMAL(10, 2) NULL DEFAULT NULL 
AFTER priceType;

-- Update existing group memberships with variable price type to have a default price per companion
UPDATE memberships 
SET pricePerCompanion = price * 0.15 
WHERE type = 'group' AND priceType = 'variable' AND pricePerCompanion IS NULL;

COMMIT;
