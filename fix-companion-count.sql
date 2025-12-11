-- Corregir el contador de acompañantes para el grupo específico
UPDATE `groups` 
SET companionCount = (
  SELECT COUNT(*) FROM `group_companions` 
  WHERE groupId = '76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f'
)
WHERE id = '76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f';

-- Verificar que se actualizó correctamente
SELECT id, name, companionCount FROM `groups` WHERE id = '76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f';
