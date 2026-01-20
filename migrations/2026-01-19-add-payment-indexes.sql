-- Migración: Crear índices para optimizar búsquedas de estado de pago
-- Fecha: 2026-01-19
-- Descripción: Agregar índices para mejorar el rendimiento de las búsquedas de pagos por estado

-- Índice para búsquedas rápidas de pagos por tipo y estado
CREATE INDEX IF NOT EXISTS `idx_payments_type_status` ON `payments` (`paymentType`, `status`);

-- Índice para búsquedas por monto (útil para encontrar pagos de $0)
CREATE INDEX IF NOT EXISTS `idx_payments_amount` ON `payments` (`amount`);

-- Índice para búsquedas de pagos pendientes por tipo
CREATE INDEX IF NOT EXISTS `idx_payments_pending` ON `payments` (`paymentType`, `status`, `createdAt`);
