-- Agregar columna memberMembershipId a la tabla payments
ALTER TABLE payments ADD COLUMN memberMembershipId VARCHAR(255) NULL;

-- Crear índice para mejorar búsquedas
CREATE INDEX idx_payments_memberMembershipId ON payments(memberMembershipId);

-- Opcional: Agregar comentario
COMMENT ON COLUMN payments.memberMembershipId IS 'Referencia a la membresía del miembro si el pago es por membresía';
