import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeGroupsResponsibleMemberIdToUserId1765400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la foreign key antigua
    await queryRunner.query(
      `ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_responsibleMemberId_members_id"`
    );

    // Renombrar columna
    await queryRunner.query(
      `ALTER TABLE "groups" RENAME COLUMN "responsibleMemberId" TO "responsibleUserId"`
    );

    // Cambiar el tipo de dato si es necesario
    await queryRunner.query(
      `ALTER TABLE "groups" ALTER COLUMN "responsibleUserId" TYPE varchar`
    );

    // Agregar nueva foreign key a users (no a members)
    await queryRunner.query(
      `ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_responsibleUserId_users_id" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revertir los cambios
    await queryRunner.query(
      `ALTER TABLE "groups" DROP CONSTRAINT "FK_groups_responsibleUserId_users_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "groups" RENAME COLUMN "responsibleUserId" TO "responsibleMemberId"`
    );

    await queryRunner.query(
      `ALTER TABLE "groups" ADD CONSTRAINT "FK_groups_responsibleMemberId_members_id" FOREIGN KEY ("responsibleMemberId") REFERENCES "members"("id") ON DELETE CASCADE`
    );
  }
}
