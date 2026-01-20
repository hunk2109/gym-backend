-- Migración: Refactorizar member_memberships para usar paymentId
-- Fecha: 2026-01-16
-- Descripción: 
--   1. Agregar columna paymentId (FK a payments.id)
--   2. Eliminar columna paymentDate (datos están en payments)
--   3. Renombrar amountPaid a payAmount (costo de la membresía - crítico para membresías variables)
--   4. Mantener isRecurring (lógica de membresía, no de pago)

-- Paso 1: Agregar columna paymentId a member_memberships
ALTER TABLE `member_memberships` 
ADD COLUMN `paymentId` VARCHAR(36) NULL,
ADD CONSTRAINT `FK_member_memberships_paymentId` 
FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL;

-- Paso 2: Crear índice en paymentId para performance
CREATE INDEX `IDX_member_memberships_paymentId` ON `member_memberships`(`paymentId`);

-- Paso 3: Renombrar amountPaid a payAmount
ALTER TABLE `member_memberships` 
CHANGE COLUMN `amountPaid` `payAmount` DECIMAL(10, 2) NULL;

-- Paso 4: Eliminar solo la columna paymentDate
-- Nota: La información de paymentDate está en payments.paymentDate, vinculada por paymentId
ALTER TABLE `member_memberships` 
DROP COLUMN `paymentDate`;
