-- Insertar cupones de cumpleaños
INSERT INTO `coupons` (
  `id`, 
  `code`, 
  `description`, 
  `discountPercentage`, 
  `isActive`, 
  `maxUsages`, 
  `usageCount`, 
  `expiryDate`, 
  `type`, 
  `createdAt`, 
  `updatedAt`
) VALUES 
(
  UUID(), 
  'CUMPLE2025', 
  '15% de descuento en tu cumpleaños', 
  15, 
  1, 
  NULL, 
  0, 
  NULL, 
  'BIRTHDAY', 
  NOW(), 
  NOW()
),
(
  UUID(), 
  'FELIZ_DIA', 
  '20% de descuento especial', 
  20, 
  1, 
  NULL, 
  0, 
  NULL, 
  'BIRTHDAY', 
  NOW(), 
  NOW()
),
(
  UUID(), 
  'REGALO_CUMPLE', 
  '25% de descuento en servicios', 
  25, 
  1, 
  NULL, 
  0, 
  NULL, 
  'BIRTHDAY', 
  NOW(), 
  NOW()
);
