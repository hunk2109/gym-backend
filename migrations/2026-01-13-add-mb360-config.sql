-- Agregar campos de configuración MB360 a gym_settings
ALTER TABLE gym_settings 
ADD COLUMN mb360_enabled BOOLEAN DEFAULT false,
ADD COLUMN mb360_ip VARCHAR(15) NULL,
ADD COLUMN mb360_port INT NULL,
ADD COLUMN mb360_username VARCHAR(100) NULL,
ADD COLUMN mb360_password VARCHAR(100) NULL,
ADD COLUMN mb360_relay_id INT NULL,
ADD COLUMN mb360_timezone VARCHAR(50) NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX idx_gym_settings_mb360_enabled ON gym_settings(mb360_enabled);
