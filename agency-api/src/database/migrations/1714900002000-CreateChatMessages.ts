import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateChatMessages1714900002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'chat_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'jobId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'role',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'content',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'attachment',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'chat_messages',
      new TableForeignKey({
        columnNames: ['jobId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'agent_jobs',
        onDelete: 'SET NULL',
      }),
    );

    // Add index for faster queries
    await queryRunner.createIndex(
      'chat_messages',
      new TableIndex({
        columnNames: ['userId', 'createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('chat_messages');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const fk of foreignKeys) {
        await queryRunner.dropForeignKey('chat_messages', fk);
      }
      await queryRunner.dropTable('chat_messages');
    }
  }
}
