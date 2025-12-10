import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMaxGroupCompanionsToMemberships1765391053000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'memberships',
      new TableColumn({
        name: 'maxGroupCompanions',
        type: 'int',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('memberships', 'maxGroupCompanions');
  }
}
