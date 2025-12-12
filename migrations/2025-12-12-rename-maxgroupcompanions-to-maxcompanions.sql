-- Ensure maxGroupCompanions column exists in memberships table
-- This is a safe check that works with existing columns
ALTER TABLE memberships 
  ADD COLUMN IF NOT EXISTS maxGroupCompanions INT NULL DEFAULT NULL;
