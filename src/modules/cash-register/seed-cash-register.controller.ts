import { Controller, Get, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('seed')
export class SeedCashRegisterController {
  constructor(@Inject(DataSource) private dataSource: DataSource) {}

  @Get('cash-register')
  async seedCashRegister() {
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      // Obtener el primer usuario
      const user = await queryRunner.query('SELECT id FROM "user" LIMIT 1');
      
      if (!user.length) {
        return { error: 'No users found' };
      }

      const userId = user[0].id;
      console.log('[Seed] Using user:', userId);

      // Insertar registros de caja de prueba
      const testData = [
        {
          id: `test-cash-${Date.now()}-1`,
          userId,
          registerDate: new Date(),
          openingAmount: 5000,
          closingAmount: 7500,
          expectedClosure: 7000,
          difference: 500,
          isOpen: false,
        },
        {
          id: `test-cash-${Date.now()}-2`,
          userId,
          registerDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          openingAmount: 3000,
          closingAmount: 5200,
          expectedClosure: 5000,
          difference: 200,
          isOpen: false,
        },
        {
          id: `test-cash-${Date.now()}-3`,
          userId,
          registerDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          openingAmount: 2500,
          closingAmount: 4800,
          expectedClosure: 4500,
          difference: 300,
          isOpen: false,
        },
      ];

      for (const data of testData) {
        await queryRunner.query(
          `INSERT INTO cash_register 
          (id, userId, registerDate, openingAmount, closingAmount, expectedClosure, difference, isOpen, createdAt, updatedAt) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            data.id,
            data.userId,
            data.registerDate,
            data.openingAmount,
            data.closingAmount,
            data.expectedClosure,
            data.difference,
            data.isOpen,
          ]
        );
      }

      return {
        success: true,
        message: 'Cash register test data seeded successfully',
        userId,
        count: testData.length,
      };
    } catch (error) {
      console.error('[Seed] Error:', error);
      return { error: error.message };
    }
  }
}
