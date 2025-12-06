-- Agregar columna cashRegisterId a tabla sales
ALTER TABLE sales ADD COLUMN `cashRegisterId` VARCHAR(36) NULL DEFAULT NULL;

-- Crear índice para queries más rápidas
CREATE INDEX idx_sales_cashRegisterId ON sales(cashRegisterId);
