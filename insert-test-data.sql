-- Script para insertar datos de prueba de pagos pendientes

-- 1. Insertar un miembro (si no existe)
INSERT INTO members (id, firstName, lastName, email, phone, joinDate, isActive, createdAt, updatedAt)
SELECT 
    UUID(), 
    'Juan', 
    'Pérez', 
    'juan.perez@test.com', 
    '+34123456789', 
    DATE_SUB(NOW(), INTERVAL 60 DAY),
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM members WHERE email = 'juan.perez@test.com'
);

-- 2. Insertar una membresía (si no existe)
INSERT INTO memberships (id, name, description, price, durationMonths, benefits, isActive, createdAt, updatedAt)
SELECT 
    UUID(),
    'Premium 3 Meses',
    'Membresía premium por 3 meses',
    99.99,
    3,
    'Acceso gym,Piscina,Clases ilimitadas',
    1,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM memberships WHERE name = 'Premium 3 Meses'
);

-- 3. Insertar una membresía para el miembro con estado PENDING (vencida hace 20 días)
INSERT INTO member_memberships (
    id, 
    memberId, 
    membershipId, 
    startDate, 
    endDate, 
    isActive, 
    classesUsed, 
    amountPaid, 
    paymentDate,
    paymentStatus,
    isRecurring,
    suspensionDate,
    createdAt, 
    updatedAt
)
SELECT 
    UUID(),
    m.id,
    mb.id,
    DATE_SUB(NOW(), INTERVAL 50 DAY),
    DATE_SUB(NOW(), INTERVAL 20 DAY),
    0,
    0,
    NULL,
    NULL,
    'pending',
    0,
    NULL,
    NOW(),
    NOW()
FROM members m
CROSS JOIN memberships mb
WHERE m.email = 'juan.perez@test.com'
AND mb.name = 'Premium 3 Meses'
AND NOT EXISTS (
    SELECT 1 FROM member_memberships mm 
    WHERE mm.memberId = m.id 
    AND mm.paymentStatus = 'pending'
);

-- Verificar los datos insertados
SELECT 
    mm.id,
    m.firstName,
    m.lastName,
    mb.name as membership,
    mb.price,
    mm.endDate,
    mm.paymentStatus,
    DATEDIFF(NOW(), mm.endDate) as dias_vencido
FROM member_memberships mm
JOIN members m ON mm.memberId = m.id
JOIN memberships mb ON mm.membershipId = mb.id
WHERE mm.paymentStatus = 'pending';
