-- Actualizar la membresía Matutino para que sea no recurrente con 3 días
UPDATE memberships 
SET is_recurring = false, duration_days = 3 
WHERE name = 'Matutino';

-- Verificar cambios
SELECT id, name, is_recurring, duration_months, duration_days FROM memberships WHERE name = 'Matutino';
