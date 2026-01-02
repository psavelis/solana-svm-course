import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class AddPerformanceIndexes1767021236000 implements MigrationInterface {
  name = 'AddPerformanceIndexes';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite indexes for common query patterns

    // Transactions: status + createdAt for recent transactions by status
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_status_created_at',
        columnNames: ['status', 'createdAt'],
      }),
    );

    // Transactions: type + status for filtering by type and status
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_type_status',
        columnNames: ['type', 'status'],
      }),
    );

    // Transactions: fromAddress + createdAt for account transaction history
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_from_address_created_at',
        columnNames: ['fromAddress', 'createdAt'],
      }),
    );

    // Transactions: toAddress + createdAt for account transaction history
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_to_address_created_at',
        columnNames: ['toAddress', 'createdAt'],
      }),
    );

    // Accounts: owner + isPda for PDA lookups
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_owner_is_pda',
        columnNames: ['owner', 'isPda'],
      }),
    );

    // Accounts: programId + createdAt for program account tracking
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_program_id_created_at',
        columnNames: ['programId', 'createdAt'],
      }),
    );

    // Tokens: owner + isNft for user NFT collections
    await queryRunner.createIndex(
      'tokens',
      new TableIndex({
        name: 'IDX_tokens_owner_is_nft',
        columnNames: ['owner', 'isNft'],
      }),
    );

    // Tokens: symbol + createdAt for token discovery
    await queryRunner.createIndex(
      'tokens',
      new TableIndex({
        name: 'IDX_tokens_symbol_created_at',
        columnNames: ['symbol', 'createdAt'],
      }),
    );

    // Partial indexes for specific conditions

    // Transactions: pending transactions only (high priority queries)
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_pending_only',
        columnNames: ['createdAt'],
        where: "status = 'pending'",
      }),
    );

    // Transactions: failed transactions for error analysis
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_failed_only',
        columnNames: ['createdAt'],
        where: "status = 'failed'",
      }),
    );

    // Accounts: PDA accounts only
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_pda_only',
        columnNames: ['programId', 'createdAt'],
        where: 'is_pda = true',
      }),
    );

    // Tokens: NFT tokens only
    await queryRunner.createIndex(
      'tokens',
      new TableIndex({
        name: 'IDX_tokens_nft_only',
        columnNames: ['createdAt'],
        where: 'is_nft = true',
      }),
    );

    // Time-based indexes for recent data queries

    // Transactions: recent transactions (last 30 days)
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'IDX_transactions_recent',
        columnNames: ['createdAt'],
        where: "created_at > NOW() - INTERVAL '30 days'",
      }),
    );

    // Accounts: recently created accounts
    await queryRunner.createIndex(
      'accounts',
      new TableIndex({
        name: 'IDX_accounts_recent',
        columnNames: ['createdAt'],
        where: "created_at > NOW() - INTERVAL '30 days'",
      }),
    );

    // Tokens: recently created tokens
    await queryRunner.createIndex(
      'tokens',
      new TableIndex({
        name: 'IDX_tokens_recent',
        columnNames: ['createdAt'],
        where: "created_at > NOW() - INTERVAL '30 days'",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop time-based indexes
    await queryRunner.dropIndex('tokens', 'IDX_tokens_recent');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_recent');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_recent');

    // Drop partial indexes
    await queryRunner.dropIndex('tokens', 'IDX_tokens_nft_only');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_pda_only');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_failed_only');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_pending_only');

    // Drop composite indexes
    await queryRunner.dropIndex('tokens', 'IDX_tokens_symbol_created_at');
    await queryRunner.dropIndex('tokens', 'IDX_tokens_owner_is_nft');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_program_id_created_at');
    await queryRunner.dropIndex('accounts', 'IDX_accounts_owner_is_pda');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_to_address_created_at');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_from_address_created_at');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_type_status');
    await queryRunner.dropIndex('transactions', 'IDX_transactions_status_created_at');
  }
}
