import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAccountsTable1735512000000 implements MigrationInterface {
  name = 'CreateAccountsTable';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create accounts table
    await queryRunner.createTable(
      new Table({
        name: 'accounts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'address',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'owner',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'balance',
            type: 'bigint',
            default: '0',
          },
          {
            name: 'isPda',
            type: 'boolean',
            default: false,
          },
          {
            name: 'programId',
            type: 'varchar',
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
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_address',
        columnNames: ['address'],
      }),
    );

    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_owner',
        columnNames: ['owner'],
      }),
    );

    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_program_id',
        columnNames: ['programId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('accounts', 'IDX_accounts_program_id');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_owner');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_address');

    // Drop table
    await queryRunner.dropTable('accounts');
  }
}
