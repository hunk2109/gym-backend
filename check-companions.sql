-- Verificar datos de acompañantes
SELECT 'Grupos' as 'Tabla', COUNT(*) as 'Total', GROUP_CONCAT(CONCAT(id, ':', companionCount)) as 'IDs y Contadores' FROM `groups`;

SELECT 'Acompañantes' as 'Tabla', COUNT(*) as 'Total' FROM `group_companions`;

-- Ver específicamente el grupo 76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f
SELECT 
  g.id,
  g.name,
  g.companionCount,
  COUNT(gc.id) as actual_companions
FROM `groups` g
LEFT JOIN `group_companions` gc ON g.id = gc.groupId
WHERE g.id = '76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f'
GROUP BY g.id, g.name, g.companionCount;

-- Ver todos los acompañantes del grupo
SELECT gc.* FROM `group_companions` WHERE groupId = '76cd6a2a-8dc0-4e2f-a4f7-79480dc6e15f';
