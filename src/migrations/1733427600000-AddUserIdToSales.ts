import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserIdToSales1733427600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'sales',
      new TableColumn({
        name: 'userId',
        type: 'varchar(36)',
        isNullable: true,
        comment: 'ID del usuario/cajero que realizó la venta',
      }),
    );

    // Crear índice para mejor performance
    await queryRunner.query(
      `CREATE INDEX idx_sales_userId ON sales(userId)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('sales', 'idx_sales_userId');
    await queryRunner.dropColumn('sales', 'userId');
  }
}
