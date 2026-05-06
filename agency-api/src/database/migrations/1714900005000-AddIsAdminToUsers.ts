import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAdminToUsers1714900005000 implements MigrationInterface {
  name = 'AddIsAdminToUsers1714900005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "isAdmin" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isAdmin"`);
  }
}
