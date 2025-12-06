import { DataSource } from 'typeorm';

export async function insertTestCashRegisterData(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  
  try {
    // Usar un UUID conocido o el primer usuario
    const userResult = await queryRunner.query(
      'SELECT id FROM user LIMIT 1'
    );
    
    if (userResult.length === 0) {
      console.log('[Seed] No users found. Skipping cash register seed.');
      return;
    }
    
    const userId = userResult[0].id;
    console.log('[Seed] Using user:', userId);
    
    const testData = [
      {
        id: 'test-cash-1',
        userId,
        registerDate: new Date(),
        openedAt: new Date(),
        closedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        openingAmount: 5000,
        closingAmount: 7500,
        expectedClosure: 7000,
        difference: 500,
        isOpen: false,
        notes: 'Test registro 1'
      },
      {
        id: 'test-cash-2',
        userId,
        registerDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        openedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
        closedAt: new Date(Date.now() - 2 * 1000 * 60 * 60 * 24), // 2 days ago
        openingAmount: 3000,
        closingAmount: 5200,
        expectedClosure: 5000,
        difference: 200,
        isOpen: false,
        notes: 'Test registro 2'
      }
    ];
    
    for (const data of testData) {
      await queryRunner.query(
        `INSERT INTO cash_register 
        (id, userId, registerDate, openedAt, closedAt, openingAmount, closingAmount, expectedClosure, difference, isOpen, notes, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [data.id, data.userId, data.registerDate, data.openedAt, data.closedAt, data.openingAmount, data.closingAmount, data.expectedClosure, data.difference, data.isOpen, data.notes]
      );
    }
    
    console.log('[Seed] Cash register test data inserted successfully');
  } catch (error) {
    console.error('[Seed] Error inserting test data:', error);
  }
}
