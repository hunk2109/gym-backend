-- Insertar datos de prueba en cash_register
INSERT INTO cash_register (id, userId, registerDate, openedAt, closedAt, openingAmount, closingAmount, expectedClosure, difference, isOpen, openingBillBreakdown, closingBillBreakdown, openingReceipts, closingReceipts, notes, createdAt, updatedAt) VALUES
('test-cash-1', '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW(), DATE_SUB(NOW(), INTERVAL 1 DAY), 5000, 7500, 7000, 500, 0, '{}', '{}', '[]', '[]', 'Test registro 1', NOW(), NOW()),
('test-cash-2', '550e8400-e29b-41d4-a716-446655440000', DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 3000, 5200, 5000, 200, 0, '{}', '{}', '[]', '[]', 'Test registro 2', NOW(), NOW()),
('test-cash-3', '550e8400-e29b-41d4-a716-446655440000', DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 2500, 4500, 4800, -300, 0, '{}', '{}', '[]', '[]', 'Test registro 3', NOW(), NOW());
