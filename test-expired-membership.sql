-- Script para crear una membresía vencida de prueba

-- 1. Obtener un miembro existente (si no hay, crear uno)
-- Buscar el primer miembro
SELECT @memberId := id FROM members LIMIT 1;

-- Si no hay miembros, crear uno para prueba
-- INSERT INTO users (id, email, firstName, lastName, phone, password, role, createdAt, updatedAt)
-- VALUES (UUID(), 'test@gym.com', 'Test', 'User', '1234567890', 'hashed_password', 'MEMBER', NOW(), NOW());
-- INSERT INTO members (id, userId, dateOfBirth, joinDate, status, createdAt, updatedAt)
-- VALUES (UUID(), @userId, '1990-01-15', NOW(), 'ACTIVE', NOW(), NOW());

-- 2. Obtener una membresía existente
SELECT @membershipId := id FROM memberships WHERE status = 'ACTIVE' LIMIT 1;

-- 3. Crear una membresía vencida hace 5 días
INSERT INTO member_memberships (id, memberId, membershipId, startDate, endDate, status, createdAt, updatedAt)
VALUES (
  UUID(),
  @memberId,
  @membershipId,
  DATE_SUB(NOW(), INTERVAL 30 DAY),
  DATE_SUB(NOW(), INTERVAL 5 DAY),  -- Vencida hace 5 días
  'ACTIVE',
  NOW(),
  NOW()
);

-- Verificar que se creó
SELECT 'Membresía vencida creada:' as resultado;
SELECT mm.id, mm.memberId, mm.endDate, DATEDIFF(NOW(), mm.endDate) as dias_vencida
FROM member_memberships mm
WHERE mm.endDate < NOW()
ORDER BY mm.endDate DESC
LIMIT 1;
