import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBillingAndSpendEvents1714900004000 implements MigrationInterface {
  name = 'AddBillingAndSpendEvents1714900004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_jobs" ADD COLUMN "baseCostKes" numeric(15,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_jobs" ADD COLUMN "billedCostKes" numeric(15,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_jobs" ADD COLUMN "creditsCharged" numeric(15,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_jobs" ADD COLUMN "billingMode" character varying(30)`,
    );

    await queryRunner.query(`
      CREATE TABLE "openclaw_spend_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "jobId" uuid,
        "runId" character varying,
        "tokensUsed" integer NOT NULL DEFAULT '0',
        "openclawCostUsd" numeric(12,6) NOT NULL DEFAULT '0',
        "usdToKesRate" numeric(10,4) NOT NULL DEFAULT '130',
        "marginRate" numeric(6,4) NOT NULL DEFAULT '0.3',
        "baseCostKes" numeric(15,2) NOT NULL DEFAULT '0',
        "billedCostKes" numeric(15,2) NOT NULL DEFAULT '0',
        "creditsCharged" numeric(15,2) NOT NULL DEFAULT '0',
        "chargeMode" character varying(30) NOT NULL DEFAULT 'CHARGED',
        "metadata" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_openclaw_spend_events_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_openclaw_spend_events_userId" ON "openclaw_spend_events" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_openclaw_spend_events_jobId" ON "openclaw_spend_events" ("jobId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "openclaw_spend_events" ADD CONSTRAINT "FK_openclaw_spend_events_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "openclaw_spend_events" ADD CONSTRAINT "FK_openclaw_spend_events_job" FOREIGN KEY ("jobId") REFERENCES "agent_jobs"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "openclaw_spend_events" DROP CONSTRAINT "FK_openclaw_spend_events_job"`,
    );
    await queryRunner.query(
      `ALTER TABLE "openclaw_spend_events" DROP CONSTRAINT "FK_openclaw_spend_events_user"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_openclaw_spend_events_jobId"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_openclaw_spend_events_userId"`);
    await queryRunner.query(`DROP TABLE "openclaw_spend_events"`);

    await queryRunner.query(`ALTER TABLE "agent_jobs" DROP COLUMN "billingMode"`);
    await queryRunner.query(`ALTER TABLE "agent_jobs" DROP COLUMN "creditsCharged"`);
    await queryRunner.query(`ALTER TABLE "agent_jobs" DROP COLUMN "billedCostKes"`);
    await queryRunner.query(`ALTER TABLE "agent_jobs" DROP COLUMN "baseCostKes"`);
  }
}
