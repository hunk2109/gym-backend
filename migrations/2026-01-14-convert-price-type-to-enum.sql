-- Convertir la columna priceType de VARCHAR a ENUM
-- Primero crear una columna ENUM temporal
ALTER TABLE memberships 
ADD COLUMN priceType_temp ENUM('fixed', 'variable') DEFAULT 'fixed' NOT NULL;

-- Copiar datos de la columna antigua a la temporal
UPDATE memberships SET priceType_temp = COALESCE(priceType, 'fixed');

-- Eliminar la columna VARCHAR antigua
ALTER TABLE memberships DROP COLUMN priceType;

-- Renombrar la columna temporal a priceType
ALTER TABLE memberships CHANGE COLUMN priceType_temp priceType ENUM('fixed', 'variable') DEFAULT 'fixed' NOT NULL;

-- Recrear el índice
DROP INDEX idx_memberships_priceType ON memberships;
CREATE INDEX idx_memberships_priceType ON memberships(priceType);
