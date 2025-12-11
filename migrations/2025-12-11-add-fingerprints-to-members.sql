-- Agregar columna fingerprints a la tabla members
ALTER TABLE members
ADD COLUMN fingerprints LONGTEXT NULL AFTER hasPendingPayment;

-- Comentario para la columna
ALTER TABLE members
MODIFY COLUMN fingerprints LONGTEXT NULL COMMENT 'JSON con información de huellas dactilares para futuro uso en autenticación biométrica';
