-- Migración: Crear tablas para sistema de mesas
-- Fecha: 2025-12-12
-- Descripción: Crear entidades para gestión de mesas y cuentas abiertas

-- 1. Tabla de mesas
CREATE TABLE IF NOT EXISTS `tables` (
  `id` varchar(36) NOT NULL,
  `tableNumber` int NOT NULL UNIQUE,
  `status` enum('available', 'open', 'occupied') NOT NULL DEFAULT 'available',
  `capacity` int NOT NULL DEFAULT 4,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_tableNumber` (`tableNumber`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de cuentas abiertas
CREATE TABLE IF NOT EXISTS `table_accounts` (
  `id` varchar(36) NOT NULL,
  `tableId` varchar(36) NOT NULL,
  `userId` varchar(36) NOT NULL,
  `status` enum('open', 'closed', 'paid', 'cancelled') NOT NULL DEFAULT 'open',
  `totalAmount` decimal(10, 2) NOT NULL DEFAULT 0,
  `discount` decimal(10, 2) NOT NULL DEFAULT 0,
  `notes` text,
  `saleId` varchar(36),
  `openedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closedAt` timestamp NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`tableId`) REFERENCES `tables`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_tableId` (`tableId`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_status` (`status`),
  INDEX `idx_openedAt` (`openedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de items en cuentas
CREATE TABLE IF NOT EXISTS `table_account_items` (
  `id` varchar(36) NOT NULL,
  `accountId` varchar(36) NOT NULL,
  `productId` varchar(36) NOT NULL,
  `quantity` int NOT NULL,
  `unitPrice` decimal(10, 2) NOT NULL,
  `subtotal` decimal(10, 2) NOT NULL,
  `addedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `removedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`accountId`) REFERENCES `table_accounts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT,
  INDEX `idx_accountId` (`accountId`),
  INDEX `idx_productId` (`productId`),
  INDEX `idx_addedAt` (`addedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Agregar parámetro de activación en module_settings
INSERT INTO `module_settings` (`moduleName`, `isEnabled`, `description`, `createdAt`, `updatedAt`) 
VALUES ('tables', false, 'Sistema de mesas para cuentas abiertas en ventas', NOW(), NOW())
ON DUPLICATE KEY UPDATE `isEnabled` = `isEnabled`;

-- 5. Insertar datos iniciales de mesas (opcional - descomenta si quieres)
-- INSERT INTO `tables` (`id`, `tableNumber`, `status`, `capacity`, `notes`, `createdAt`, `updatedAt`)
-- VALUES 
--   (UUID(), 1, 'available', 4, 'Mesa 1', NOW(), NOW()),
--   (UUID(), 2, 'available', 4, 'Mesa 2', NOW(), NOW()),
--   (UUID(), 3, 'available', 4, 'Mesa 3', NOW(), NOW()),
--   (UUID(), 4, 'available', 4, 'Mesa 4', NOW(), NOW()),
--   (UUID(), 5, 'available', 4, 'Mesa 5', NOW(), NOW()),
--   (UUID(), 6, 'available', 6, 'Mesa grande 1', NOW(), NOW()),
--   (UUID(), 7, 'available', 6, 'Mesa grande 2', NOW(), NOW()),
--   (UUID(), 8, 'available', 2, 'Barra 1', NOW(), NOW()),
--   (UUID(), 9, 'available', 2, 'Barra 2', NOW(), NOW()),
--   (UUID(), 10, 'available', 2, 'Barra 3', NOW(), NOW());
