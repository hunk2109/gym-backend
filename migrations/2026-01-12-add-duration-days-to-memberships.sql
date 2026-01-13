-- Agregar columna durationDays para membresías no recurrentes
ALTER TABLE memberships ADD COLUMN duration_days INT NULL AFTER duration_months;

-- Comentario para claridad
-- duration_days: Para membresías no recurrentes (ej: Matutino de 3 días)
-- Si is_recurring = false, usar duration_days en lugar de duration_months

-- Asegurar que membresías existentes tengan is_recurring = true por defecto
UPDATE memberships SET is_recurring = true WHERE is_recurring IS NULL;
