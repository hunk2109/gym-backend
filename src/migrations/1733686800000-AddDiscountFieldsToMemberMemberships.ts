import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDiscountFieldsToMemberMemberships1733686800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar columna de código de promoción
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'appliedPromotionCode',
        type: 'varchar(50)',
        isNullable: true,
        comment: 'Código de cupón/promoción aplicado',
      }),
    );

    // Agregar columna de monto de descuento
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'discountAmount',
        type: 'decimal(10,2)',
        default: 0,
        comment: 'Monto total del descuento en pesos',
      }),
    );

    // Agregar columna de porcentaje de descuento
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'discountPercentage',
        type: 'decimal(5,2)',
        default: 0,
        comment: 'Porcentaje total de descuento aplicado',
      }),
    );

    // Agregar columna de razón del descuento
    await queryRunner.addColumn(
      'member_memberships',
      new TableColumn({
        name: 'discountReason',
        type: 'varchar(255)',
        isNullable: true,
        comment: 'Razón del descuento adicional',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('member_memberships', 'appliedPromotionCode');
    await queryRunner.dropColumn('member_memberships', 'discountAmount');
    await queryRunner.dropColumn('member_memberships', 'discountPercentage');
    await queryRunner.dropColumn('member_memberships', 'discountReason');
  }
}
