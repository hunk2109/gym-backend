-- Crear tabla de promociones
CREATE TABLE IF NOT EXISTS `promotions` (
  `id` varchar(36) NOT NULL,
  `code` varchar(50) NOT NULL UNIQUE,
  `discountPercentage` decimal(5,2) NOT NULL,
  `description` text,
  `capturesBirthday` boolean DEFAULT false,
  `maxUses` int DEFAULT NULL,
  `usesCount` int DEFAULT 0,
  `active` boolean DEFAULT true,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `expiresAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_code` (`code`),
  KEY `idx_active` (`active`),
  KEY `idx_expiresAt` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar algunas promociones de ejemplo
INSERT INTO `promotions` (`id`, `code`, `discountPercentage`, `description`, `capturesBirthday`, `active`, `createdAt`) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'BDAY10', 10.00, 'Descuento por cumpleaños', 1, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440001', 'NEWMEMBER15', 15.00, 'Descuento para nuevos miembros', 0, 1, NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'WELCOME5', 5.00, 'Bienvenida a nuevos clientes', 0, 1, NOW());
