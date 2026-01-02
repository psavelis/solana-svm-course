import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateMpcTables1735512000005 implements MigrationInterface {
  name = 'CreateMpcTables1735512000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create mpc_wallets table
    await queryRunner.createTable(
      new Table({
        name: 'mpc_wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'walletId',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
          },
          {
            name: 'thresholdScheme',
            type: 'enum',
            enum: ['2-of-3', '3-of-5', '4-of-7'],
            default: "'2-of-3'",
          },
          {
            name: 'totalShares',
            type: 'int',
          },
          {
            name: 'threshold',
            type: 'int',
          },
          {
            name: 'publicKey',
            type: 'text',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['creating', 'active', 'recovering', 'disabled'],
            default: "'creating'",
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

    // Create key_shares table
    await queryRunner.createTable(
      new Table({
        name: 'key_shares',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'walletId',
            type: 'uuid',
          },
          {
            name: 'participantId',
            type: 'varchar',
          },
          {
            name: 'shareIndex',
            type: 'int',
          },
          {
            name: 'encryptedShare',
            type: 'text',
          },
          {
            name: 'participantPublicKey',
            type: 'text',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'revoked', 'lost', 'recovering'],
            default: "'active'",
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['original', 'recovery', 'backup'],
            default: "'original'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
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

    // Create indexes
    await queryRunner.createIndex(
      'key_shares',
      new TableIndex({
        name: 'IDX_key_shares_wallet_participant',
        columnNames: ['walletId', 'participantId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'key_shares',
      new TableIndex({
        name: 'IDX_key_shares_wallet_id',
        columnNames: ['walletId'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'key_shares',
      new TableForeignKey({
        columnNames: ['walletId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'mpc_wallets',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const keySharesTable = await queryRunner.getTable('key_shares');
    const foreignKey = keySharesTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('walletId') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('key_shares', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('key_shares', 'IDX_key_shares_wallet_participant');
    await queryRunner.dropIndex('key_shares', 'IDX_key_shares_wallet_id');

    // Drop tables
    await queryRunner.dropTable('key_shares');
    await queryRunner.dropTable('mpc_wallets');
  }
}
