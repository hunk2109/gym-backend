-- Agregar columna priceType a la tabla memberships como ENUM
-- 'fixed' para precio fijo, 'variable' para precio incremental

ALTER TABLE memberships 
ADD COLUMN priceType ENUM('fixed', 'variable') DEFAULT 'fixed' NOT NULL AFTER isRecurring;

-- Crear índice para búsquedas por tipo de precio
CREATE INDEX idx_memberships_priceType ON memberships(priceType);
