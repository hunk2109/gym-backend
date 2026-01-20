-- Migración: Marcar pagos de $0 como COMPLETED
-- Fecha: 2026-01-19
-- Descripción: Asegurar que todos los pagos con monto $0 sean marcados como COMPLETED
-- Esta migración corrige pagos que fueron creados pero no se marcaron correctamente como completados

UPDATE `payments` 
SET `status` = 'completed', 
    `paymentDate` = NOW() 
WHERE `amount` = 0 AND `status` = 'pending' AND `paymentDate` IS NULL;

-- Verificación: mostrar los pagos que se actualizaron
SELECT CONCAT('Pagos de $0 corregidos: ', ROW_COUNT()) AS 'Resultado';
