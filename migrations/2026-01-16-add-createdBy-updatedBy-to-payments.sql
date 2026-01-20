-- Migración: Eliminar memberId, agregar createdBy y updatedBy
-- Fecha: 16 de enero de 2026

-- Eliminar la FK y la columna memberId
ALTER TABLE payments 
DROP FOREIGN KEY payments_ibfk_1,
DROP COLUMN memberId;

-- Agregar columnas createdBy y updatedBy
ALTER TABLE payments 
ADD COLUMN createdBy VARCHAR(255) NULL COMMENT 'userId de quien creó la transacción',
ADD COLUMN updatedBy VARCHAR(255) NULL COMMENT 'userId de quien actualizó la transacción';

-- Crear índices para optimizar búsquedas
CREATE INDEX idx_payments_createdBy ON payments(createdBy);
CREATE INDEX idx_payments_updatedBy ON payments(updatedBy);
