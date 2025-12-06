-- Script para eliminar ventas duplicadas
-- Las 2 ventas reales son: 1155fc0a y 383486f7
-- Las 2 duplicadas son: 6440189d y 75abfbce

-- Primero, eliminar los items asociados a las ventas duplicadas
DELETE FROM sale_items WHERE saleId IN (
  '6440189d-1a73-4ca4-9c61-f57fc6221e98',
  '75abfbce-63bd-4cf5-9e54-6806d9044cc7'
);

-- Luego, eliminar las ventas duplicadas
DELETE FROM sales WHERE id IN (
  '6440189d-1a73-4ca4-9c61-f57fc6221e98',
  '75abfbce-63bd-4cf5-9e54-6806d9044cc7'
);

-- Verificar que quedaron solo 2 ventas
SELECT id, totalAmount, status FROM sales WHERE DATE(createdAt) = '2025-12-05' ORDER BY createdAt DESC;
