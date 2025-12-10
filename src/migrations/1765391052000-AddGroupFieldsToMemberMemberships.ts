import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddGroupFieldsToMemberMemberships1765391052000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna groupId
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'groupId',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Agregar columna membershipType
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'membershipType',
        type: 'varchar',
        length: '20',
        default: "'individual'",
        isNullable: false,
      }),
    );

    // Agregar foreign key para groupId
    await queryRunner.createForeignKey(
      'member_memberships',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remover foreign key
    const table = await queryRunner.getTable('member_memberships');
    if (table && table.foreignKeys) {
      const foreignKey = table.foreignKeys.find((fk) =>
        fk.columnNames.includes('groupId'),
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('member_memberships', foreignKey);
      }
    }

    // Remover columnas
    await queryRunner.dropColumn('member_memberships', 'membershipType');
    await queryRunner.dropColumn('member_memberships', 'groupId');
  }
}
