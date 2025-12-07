-- Debug: Verificar estado de pagos pendientes

-- 1. Contar pagos PENDING SIN memberMembershipId
SELECT 'Pagos PENDING sin memberMembershipId' as tipo, COUNT(*) as cantidad, SUM(amount) as total
FROM payments
WHERE status = 'pending' AND (memberMembershipId IS NULL OR memberMembershipId = '');

-- 2. Contar pagos PENDING CON memberMembershipId
SELECT 'Pagos PENDING con memberMembershipId' as tipo, COUNT(*) as cantidad, SUM(amount) as total
FROM payments
WHERE status = 'pending' AND memberMembershipId IS NOT NULL AND memberMembershipId != '';

-- 3. Contar membresías PENDING
SELECT 'Membresías PENDING' as tipo, COUNT(*) as cantidad, SUM(m.price) as total
FROM member_memberships mm
LEFT JOIN memberships m ON m.id = mm.membershipId
WHERE mm.paymentStatus = 'pending';

-- 4. Detalles de pagos PENDING
SELECT 'PAGOS PENDING DETAIL:' as info;
SELECT p.id, p.memberId, p.memberMembershipId, p.status, p.amount, p.paymentType, p.createdAt
FROM payments p
WHERE p.status = 'pending'
ORDER BY p.createdAt DESC;

-- 5. Detalles de membresías PENDING
SELECT 'MEMBRESÍAS PENDING DETAIL:' as info;
SELECT mm.id, mm.memberId, mm.membershipId, mm.paymentStatus, m.price, mm.createdAt
FROM member_memberships mm
LEFT JOIN memberships m ON m.id = mm.membershipId
WHERE mm.paymentStatus = 'pending'
ORDER BY mm.createdAt DESC;
