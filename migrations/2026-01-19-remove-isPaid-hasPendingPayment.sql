-- Migración para eliminar columnas obsoletas de members
ALTER TABLE members DROP COLUMN IF EXISTS isPaid;
ALTER TABLE members DROP COLUMN IF EXISTS hasPendingPayment;
ALTER TABLE members DROP COLUMN IF EXISTS hasRegistrationPaymentPending;
ALTER TABLE members DROP COLUMN IF EXISTS hasMembershipPaymentPending;
ALTER TABLE members DROP COLUMN IF EXISTS hasMembership;
