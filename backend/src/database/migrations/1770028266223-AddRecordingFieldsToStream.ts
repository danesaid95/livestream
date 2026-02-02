import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecordingFieldsToStream1770028266223 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "streams"
            ADD COLUMN IF NOT EXISTS "recordingResourceId" varchar(255),
            ADD COLUMN IF NOT EXISTS "recordingSid" varchar(255),
            ADD COLUMN IF NOT EXISTS "recordingUid" integer
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "streams"
            DROP COLUMN IF EXISTS "recordingResourceId",
            DROP COLUMN IF EXISTS "recordingSid",
            DROP COLUMN IF EXISTS "recordingUid"
        `);
    }

}
