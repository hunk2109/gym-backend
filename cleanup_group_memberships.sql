-- Script para limpiar datos inválidos en group_memberships
-- Esta consulta limpia todas las group_memberships con responsibleUserId que no existe

-- Primero: desactivar foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar group_companions que referencian group_memberships inválidas
DELETE FROM group_companions 
WHERE groupMembershipId IN (
  SELECT id FROM group_memberships 
  WHERE responsibleUserId IS NOT NULL 
  AND responsibleUserId NOT IN (SELECT id FROM users)
);

-- Actualizar a NULL los responsibleUserId inválidos
UPDATE group_memberships 
SET responsibleUserId = NULL 
WHERE responsibleUserId IS NOT NULL 
AND responsibleUserId NOT IN (SELECT id FROM users);

-- Reactivar foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Verificar resultado
SELECT COUNT(*) as total_group_memberships FROM group_memberships;
SELECT COUNT(*) as invalid_responsible_users FROM group_memberships WHERE responsibleUserId NOT IN (SELECT id FROM users);
