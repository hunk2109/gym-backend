-- Tabla para module_settings
CREATE TABLE IF NOT EXISTS `module_settings` (
  `id` varchar(36) NOT NULL,
  `moduleName` varchar(100) NOT NULL,
  `isEnabled` tinyint NOT NULL DEFAULT 1,
  `description` longtext,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_module_name` (`moduleName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
