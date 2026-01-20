-- Migración: Cambiar paymentDate a DATETIME
-- Fecha: 2026-01-14
-- Descripción: Cambiar el tipo de dato del campo paymentDate de DATE a DATETIME para incluir hora

ALTER TABLE `payments` 
MODIFY COLUMN `paymentDate` DATETIME NULL DEFAULT NULL;
