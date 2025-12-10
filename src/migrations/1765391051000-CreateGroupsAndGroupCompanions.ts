import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateGroupsAndGroupCompanions1765391051000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Crear tabla groups
    await queryRunner.createTable(
      new Table({
        name: 'groups',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'membershipId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'responsibleMemberId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'startDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'endDate',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'companionCount',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Agregar foreign keys a groups
    await queryRunner.createForeignKey(
      'groups',
      new TableForeignKey({
        columnNames: ['membershipId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'memberships',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'groups',
      new TableForeignKey({
        columnNames: ['responsibleMemberId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'members',
        onDelete: 'CASCADE',
      }),
    );

    // Crear tabla group_companions
    await queryRunner.createTable(
      new Table({
        name: 'group_companions',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
          },
          {
            name: 'groupId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'memberId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'relationship',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Agregar foreign keys a group_companions
    await queryRunner.createForeignKey(
      'group_companions',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'group_companions',
      new TableForeignKey({
        columnNames: ['memberId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'members',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar foreign keys
    const table = await queryRunner.getTable('group_companions');
    if (table && table.foreignKeys) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('group_companions', fk);
      }
    }

    const groupTable = await queryRunner.getTable('groups');
    if (groupTable && groupTable.foreignKeys) {
      const groupForeignKeys = groupTable.foreignKeys;
      for (const fk of groupForeignKeys) {
        await queryRunner.dropForeignKey('groups', fk);
      }
    }

    // Eliminar tablas
    await queryRunner.dropTable('group_companions', true);
    await queryRunner.dropTable('groups', true);
  }
}
