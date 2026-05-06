import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentTransactions1714900003000 implements MigrationInterface {
  name = 'CreatePaymentTransactions1714900003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "reference" character varying NOT NULL,
        "amountKobo" bigint NOT NULL,
        "currency" character varying(10) NOT NULL DEFAULT 'KES',
        "status" character varying(30) NOT NULL DEFAULT 'PENDING',
        "authorizationUrl" character varying,
        "accessCode" character varying,
        "gatewayReference" character varying,
        "paidAt" TIMESTAMP,
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_transactions_reference" UNIQUE ("reference")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_payment_transactions_userId" ON "payment_transactions" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "payment_transactions" ADD CONSTRAINT "FK_payment_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_transactions" DROP CONSTRAINT "FK_payment_transactions_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_payment_transactions_userId"`);
    await queryRunner.query(`DROP TABLE "payment_transactions"`);
  }
}
