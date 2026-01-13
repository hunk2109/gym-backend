-- Add hasRegistrationPaymentPending and hasMembershipPaymentPending columns to members table
ALTER TABLE members ADD COLUMN hasRegistrationPaymentPending BOOLEAN DEFAULT false;
ALTER TABLE members ADD COLUMN hasMembershipPaymentPending BOOLEAN DEFAULT false;
