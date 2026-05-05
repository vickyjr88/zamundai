import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1714900000000 implements MigrationInterface {
    name = 'InitialSchema1714900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_jobs_status_enum" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "telegramId" character varying, "mobileNumber" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "resetPasswordToken" character varying, "creditBalance" numeric(15,2) NOT NULL DEFAULT '0', "paystackCustomerId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672df88f13dcf5c0d3991930b" UNIQUE ("telegramId"), CONSTRAINT "UQ_78a916df40e02a9eb965a2d04a8" UNIQUE ("mobileNumber"), CONSTRAINT "UQ_97672df88f13dcf5c0d3991930c" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "agent_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sessionId" character varying NOT NULL, "status" "public"."agent_jobs_status_enum" NOT NULL DEFAULT 'PENDING', "tokensUsed" integer NOT NULL DEFAULT '0', "costInUsd" numeric(10,4) NOT NULL DEFAULT '0', "prompt" text NOT NULL, "response" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_8e3c35b8045f09673410526e0e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "agent_jobs" ADD CONSTRAINT "FK_56046e7f86414704b4e3633664d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "agent_jobs" DROP CONSTRAINT "FK_56046e7f86414704b4e3633664d"`);
        await queryRunner.query(`DROP TABLE "agent_jobs"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."agent_jobs_status_enum"`);
    }

}
