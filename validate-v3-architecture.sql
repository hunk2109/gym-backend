/**
 * VALIDACIÓN DE INTEGRIDAD - ARQUITECTURA V3
 * 
 * Scripts SQL para validar que la migración a v3 fue correcta
 * Ejecutar contra la base de datos para verificar estado
 */

-- ============================================================================
-- 1. VALIDAR TABLAS EXISTEN
-- ============================================================================

SELECT 'Validando existencia de tablas...' as 'Status';

-- Verificar tabla principal
SELECT TABLE_NAME, ENGINE, TABLE_ROWS 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME IN ('group_memberships', 'group_companions', 'member_memberships', 'memberships', 'payments')
ORDER BY TABLE_NAME;

-- ============================================================================
-- 2. VALIDAR ESTRUCTURA DE group_companions (NUEVA)
-- ============================================================================

SELECT 'Validando estructura de group_companions...' as 'Status';

SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY,
  EXTRA
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'group_companions'
ORDER BY ORDINAL_POSITION;

-- Columnas esperadas:
-- id (VARCHAR, PK)
-- groupMembershipId (VARCHAR, FK, NOT NULL)
-- userId (VARCHAR, FK, NOT NULL)
-- status (VARCHAR, NOT NULL, enum: ACTIVE|REMOVED|INACTIVE)
-- addedAt (DATETIME, NOT NULL)
-- removedAt (DATETIME, nullable)

-- ============================================================================
-- 3. VALIDAR CAMPOS NUEVOS EN membership
-- ============================================================================

SELECT 'Validando campos nuevos en membership...' as 'Status';

SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'memberships'
  AND COLUMN_NAME IN ('type', 'parentMembershipId')
ORDER BY COLUMN_NAME;

-- Esperado:
-- type: VARCHAR, default 'individual'
-- parentMembershipId: VARCHAR, nullable

-- ============================================================================
-- 4. VALIDAR CAMPOS NUEVOS EN member_memberships
-- ============================================================================

SELECT 'Validando campos nuevos en member_memberships...' as 'Status';

SELECT 
  COLUMN_NAME,
  COLUMN_TYPE,
  COLUMN_DEFAULT,
  IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'member_memberships'
  AND COLUMN_NAME IN ('isGroupResponsible', 'groupMembershipId')
ORDER BY COLUMN_NAME;

-- Esperado:
-- isGroupResponsible: TINYINT (boolean), default 0
-- groupMembershipId: VARCHAR, nullable

-- ============================================================================
-- 5. VALIDAR RELACIONES FOREIGNKEY
-- ============================================================================

SELECT 'Validando Foreign Keys...' as 'Status';

SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND (TABLE_NAME = 'group_companions' 
       OR (TABLE_NAME = 'member_memberships' AND COLUMN_NAME IN ('groupMembershipId')))
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- ============================================================================
-- 6. CONTAR DATOS: Responsables vs Acompañantes
-- ============================================================================

SELECT 'Contando responsables y acompañantes...' as 'Status';

SELECT 
  'Responsables (MemberMembership.isGroupResponsible = true)' as 'Tipo',
  COUNT(*) as 'Cantidad'
FROM member_memberships
WHERE isGroupResponsible = true;

SELECT 
  'Acompañantes (GroupCompanion.status = ACTIVE)' as 'Tipo',
  COUNT(*) as 'Cantidad'
FROM group_companions
WHERE status = 'ACTIVE';

-- ============================================================================
-- 7. CRÍTICO: VALIDAR QUE ACOMPAÑANTES NO GENEREN PAYMENTS
-- ============================================================================

SELECT 'CRÍTICO: Validar que acompañantes NO tienen Payments...' as 'Status';

-- Acompañantes que tienen Payments (debería ser 0)
SELECT 
  'ALERTA: Acompañantes con Payments' as 'Error',
  COUNT(*) as 'Cantidad'
FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
JOIN group_companions gc ON gc.userId = mm.userId
WHERE mm.isGroupResponsible = false
  AND gc.status = 'ACTIVE';

-- Si resultado > 0, HAY UN PROBLEMA

-- ============================================================================
-- 8. VALIDAR: Solo responsables generan Payments
-- ============================================================================

SELECT 'Validar: Solo responsables generan Payments...' as 'Status';

-- Pagos sin responsable asignado (debería ser 0)
SELECT 
  'ALERTA: Payments sin isGroupResponsible' as 'Error',
  COUNT(*) as 'Cantidad'
FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
WHERE mm.isGroupResponsible = false;

-- Si resultado > 0, HAY UN PROBLEMA

-- ============================================================================
-- 9. ANALIZAR GRUPO: Estructura Completa
-- ============================================================================

SELECT 'Analizando estructura de grupo (ejemplo)...' as 'Status';

-- Seleccionar un grupo de ejemplo (reemplazar UUID)
SELECT 
  'Grupo Details' as 'Info',
  gm.id,
  gm.responsibleUserId,
  m.membershipId,
  m.type as 'MembershipType',
  gm.maxMembers,
  1 + IFNULL(gc_count.count, 0) as 'CurrentMembers',
  gm.maxMembers - (1 + IFNULL(gc_count.count, 0)) as 'AvailableSlots'
FROM group_memberships gm
LEFT JOIN memberships m ON m.id = gm.membershipId
LEFT JOIN (
  SELECT groupMembershipId, COUNT(*) as count
  FROM group_companions
  WHERE status = 'ACTIVE'
  GROUP BY groupMembershipId
) gc_count ON gc_count.groupMembershipId = gm.id
LIMIT 1;

-- ============================================================================
-- 10. REPORTE: Responsables con sus Acompañantes
-- ============================================================================

SELECT 'Reporte: Responsables y sus acompañantes...' as 'Status';

SELECT 
  gm.id as 'GroupId',
  gm.responsibleUserId as 'Responsable',
  COUNT(CASE WHEN gc.status = 'ACTIVE' THEN 1 END) as 'AcompañantesActivos',
  COUNT(CASE WHEN gc.status = 'REMOVED' THEN 1 END) as 'AcompañantesRemovidos',
  mm.paymentStatus as 'PaymentStatus',
  m.type as 'MembershipType'
FROM group_memberships gm
LEFT JOIN group_companions gc ON gc.groupMembershipId = gm.id
LEFT JOIN member_memberships mm ON mm.userId = gm.responsibleUserId AND mm.isGroupResponsible = true
LEFT JOIN memberships m ON m.id = gm.membershipId
GROUP BY gm.id, gm.responsibleUserId, mm.paymentStatus, m.type
ORDER BY gm.id;

-- ============================================================================
-- 11. VALIDAR: membershipType = GROUP para grupos
-- ============================================================================

SELECT 'Validar: Membership.type debe ser GROUP...' as 'Status';

SELECT 
  'ALERTA: Grupos con Membership.type != GROUP' as 'Error',
  COUNT(*) as 'Cantidad'
FROM group_memberships gm
LEFT JOIN memberships m ON m.id = gm.membershipId
WHERE m.type != 'group' OR m.type IS NULL;

-- Si resultado > 0, HAY UN PROBLEMA

-- ============================================================================
-- 12. VALIDAR: No hay datos en grupo_membership_users (deprecada)
-- ============================================================================

SELECT 'Validar: Tabla deprecada grupo_membership_users...' as 'Status';

SELECT 
  'ALERTA: Datos en tabla deprecada' as 'Error',
  COUNT(*) as 'Cantidad'
FROM group_membership_users
WHERE deletedAt IS NULL;

-- Si resultado > 0, necesita limpieza

-- ============================================================================
-- 13. INTEGRIDAD: Cada grupo debe tener exactamente 1 responsable
-- ============================================================================

SELECT 'Integridad: Validar 1 responsable por grupo...' as 'Status';

SELECT 
  'ALERTA: Grupos sin responsable MemberMembership' as 'Error',
  COUNT(DISTINCT gm.id) as 'Cantidad'
FROM group_memberships gm
LEFT JOIN member_memberships mm ON mm.userId = gm.responsibleUserId 
  AND mm.isGroupResponsible = true 
  AND mm.groupMembershipId = gm.id
WHERE mm.id IS NULL;

-- Si resultado > 0, HAY DATOS INCOMPLETOS

-- ============================================================================
-- 14. DASHBOARD CHECK: Pagos Pendientes Correctos
-- ============================================================================

SELECT 'Dashboard Check: Pagos pendientes (solo responsables)...' as 'Status';

SELECT 
  'Pagos Pendientes' as 'Tipo',
  COUNT(*) as 'Total'
FROM payments p
JOIN member_memberships mm ON p.memberMembershipId = mm.id
WHERE p.status = 'pending'
  AND mm.isGroupResponsible = true;

-- Este número es la verdad: Pagos generados SOLO por responsables

-- ============================================================================
-- 15. RESUMEN FINAL: Validación de Integridad
-- ============================================================================

SELECT 'RESUMEN FINAL' as 'Validación';

SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM group_companions) > 0 THEN '✅'
    ELSE '❌'
  END as 'Status',
  'Tabla group_companions existe con datos' as 'Validación'
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM memberships WHERE type IN ('group', 'individual')) = (SELECT COUNT(*) FROM memberships) THEN '✅'
    ELSE '❌'
  END,
  'Memberships tienen type field'
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM member_memberships WHERE isGroupResponsible IN (0, 1)) = (SELECT COUNT(*) FROM member_memberships) THEN '✅'
    ELSE '❌'
  END,
  'MemberMemberships tienen isGroupResponsible field'
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM payments p
          JOIN member_memberships mm ON p.memberMembershipId = mm.id
          WHERE mm.isGroupResponsible = false) = 0 THEN '✅'
    ELSE '❌'
  END,
  'Acompañantes NO generan Payments'
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM group_memberships gm
          LEFT JOIN member_memberships mm ON mm.userId = gm.responsibleUserId AND mm.isGroupResponsible = true
          WHERE mm.id IS NULL) = 0 THEN '✅'
    ELSE '❌'
  END,
  'Cada grupo tiene MemberMembership responsable'
UNION ALL
SELECT 
  CASE 
    WHEN (SELECT COUNT(*) FROM group_memberships gm
          LEFT JOIN memberships m ON m.id = gm.membershipId
          WHERE m.type != 'group') = 0 THEN '✅'
    ELSE '❌'
  END,
  'Memberships de grupos tienen type = GROUP'
ORDER BY Status DESC, Validación;
