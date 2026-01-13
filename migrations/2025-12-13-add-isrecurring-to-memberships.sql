-- Migration: Agregar columna isRecurring a la tabla memberships
-- Esta columna controla si una membresía genera renovaciones automáticas
-- Si es true: se genera pago de renovación automáticamente cuando expira
-- Si es false: solo pago inicial al asignar, sin renovación automática

ALTER TABLE memberships ADD COLUMN isRecurring BOOLEAN DEFAULT true AFTER isActive;

-- Mensaje de confirmación
SELECT 'Migration: Columna isRecurring agregada a memberships' AS status;
