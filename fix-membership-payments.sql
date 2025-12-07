-- Migración: Vincular pagos PENDING de membresías con sus member_memberships
-- Actualizar registros de Payment que no tienen memberMembershipId pero son pagos de membresía

UPDATE payments p
SET p.memberMembershipId = (
  SELECT mm.id 
  FROM member_memberships mm
  WHERE mm.memberId = p.memberId 
    AND mm.membershipId IS NOT NULL
  ORDER BY mm.createdAt DESC
  LIMIT 1
)
WHERE p.status = 'pending' 
  AND p.paymentType = 'MEMBERSHIP'
  AND (p.memberMembershipId IS NULL OR p.memberMembershipId = '')
  AND p.memberId IN (
    SELECT mm.memberId 
    FROM member_memberships mm 
    WHERE mm.paymentStatus = 'pending'
  );
