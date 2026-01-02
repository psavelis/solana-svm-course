import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTransactionsTable1735512000001 implements MigrationInterface {
  name = 'CreateTransactionsTable';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(`
      CREATE TYPE transaction_status AS ENUM('pending', 'confirmed', 'failed');
    `);

    await queryRunner.query(`
      CREATE TYPE transaction_type AS ENUM('transfer', 'token_transfer', 'program_interaction', 'account_creation');
    `);

    // Create transactions table
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'signature',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['transfer', 'token_transfer', 'program_interaction', 'account_creation'],
            enumName: 'transaction_type',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'confirmed', 'failed'],
            enumName: 'transaction_status',
            default: "'pending'",
          },
          {
            name: 'fromAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'toAddress',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'amount',
            type: 'bigint',
            default: '0',
          },
          {
            name: 'fee',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'slot',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'blockTime',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'instructions',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_signature',
        columnNames: ['signature'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_from_address',
        columnNames: ['fromAddress'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_to_address',
        columnNames: ['toAddress'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_slot',
        columnNames: ['slot'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('transactions', 'IDX_transactions_slot');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_to_address');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_from_address');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_type');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_status');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_signature');

    // Drop table
    await queryRunner.dropTable('transactions');

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS transaction_status;`);
  }
}
