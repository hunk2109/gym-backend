import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeGroupMembershipCreatedByUserIdNullable1733699400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`group_memberships\` CHANGE \`createdByUserId\` \`createdByUserId\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`group_memberships\` CHANGE \`createdByUserId\` \`createdByUserId\` varchar(255) NOT NULL`,
    );
  }
}
