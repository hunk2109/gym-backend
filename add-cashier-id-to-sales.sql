-- Agregar columna cashierId a la tabla sales
ALTER TABLE sales ADD COLUMN cashierId VARCHAR(36) NULL AFTER cashRegisterId;
CREATE INDEX idx_sales_cashier ON sales(cashierId);
CREATE INDEX idx_sales_cashier_date ON sales(cashierId, createdAt);

-- Comentario descriptivo
ALTER TABLE sales MODIFY COLUMN cashierId VARCHAR(36) NULL COMMENT 'UUID del usuario (cajero) que realizó la venta';
