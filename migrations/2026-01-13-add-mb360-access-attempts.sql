-- Migration: Add MB360 additional fields and create access_attempts table
-- Date: 2026-01-13

-- Agregar campos adicionales a gym_settings
ALTER TABLE `gym_settings` 
ADD COLUMN `mb360_connection_status` VARCHAR(255) DEFAULT 'unknown' AFTER `mb360_timezone`,
ADD COLUMN `mb360_last_heartbeat` DATETIME NULL AFTER `mb360_connection_status`;

-- Crear tabla de intentos de acceso
CREATE TABLE `access_attempts` (
  `id` CHAR(36) NOT NULL PRIMARY KEY COMMENT 'UUID',
  `gym_settings_id` CHAR(36) NOT NULL COMMENT 'FK a gym_settings',
  `member_id` CHAR(36) NULL COMMENT 'FK a members',
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('success', 'denied', 'not_found') NOT NULL DEFAULT 'not_found',
  `biometric_type` ENUM('fingerprint', 'face', 'card') NULL,
  `reason` TEXT NULL COMMENT 'Razón del resultado (ej: sin_membresía, membresía_suspendida)',
  `device_source` VARCHAR(255) NULL COMMENT 'origen del evento (manual, mb360, qr_code, etc)',
  `mb360_event_id` VARCHAR(255) NULL COMMENT 'ID del evento en el dispositivo',
  `door_opened` BOOLEAN DEFAULT 1 COMMENT '¿Se abrió la puerta?',
  `relay_used` INT NULL COMMENT 'Número del relé utilizado',
  `additional_data` TEXT NULL COMMENT 'JSON con datos adicionales',
  
  KEY `idx_gym_settings_id` (`gym_settings_id`),
  KEY `idx_member_id` (`member_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_status` (`status`),
  
  CONSTRAINT `fk_access_attempts_gym_settings` 
    FOREIGN KEY (`gym_settings_id`) 
    REFERENCES `gym_settings` (`id`) 
    ON DELETE CASCADE,
  CONSTRAINT `fk_access_attempts_member` 
    FOREIGN KEY (`member_id`) 
    REFERENCES `members` (`id`) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de intentos de acceso biométrico del MB360';

-- Crear índice compuesto para búsquedas rápidas
CREATE INDEX `idx_gym_timestamp_status` ON `access_attempts` (`gym_settings_id`, `timestamp` DESC, `status`);
