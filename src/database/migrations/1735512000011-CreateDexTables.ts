import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDexTables1735512000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dex_pools table
    await queryRunner.createTable(
      new Table({
        name: 'dex_pools',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'poolAddress',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'dexType',
            type: 'enum',
            enum: ['amm', 'order_book', 'clamm'],
          },
          {
            name: 'dexProgramId',
            type: 'varchar',
          },
          {
            name: 'tokenAMint',
            type: 'varchar',
          },
          {
            name: 'tokenBMint',
            type: 'varchar',
          },
          {
            name: 'tokenABalance',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'tokenBBalance',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'feeRate',
            type: 'decimal',
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'ammAuthority',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'poolTokenMint',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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

    // Create dex_swaps table
    await queryRunner.createTable(
      new Table({
        name: 'dex_swaps',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'transactionSignature',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'poolId',
            type: 'uuid',
          },
          {
            name: 'userAddress',
            type: 'varchar',
          },
          {
            name: 'direction',
            type: 'enum',
            enum: ['a_to_b', 'b_to_a'],
          },
          {
            name: 'amountIn',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'amountOut',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'feeAmount',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'priceImpact',
            type: 'decimal',
            precision: 18,
            scale: 9,
          },
          {
            name: 'slippage',
            type: 'decimal',
            precision: 18,
            scale: 9,
          },
          {
            name: 'minimumAmountOut',
            type: 'decimal',
            precision: 36,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'route',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'confirmed'",
          },
          {
            name: 'slot',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'blockTime',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
        foreignKeys: [
          {
            columnNames: ['poolId'],
            referencedTableName: 'dex_pools',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Create dex_liquidity_positions table
    await queryRunner.createTable(
      new Table({
        name: 'dex_liquidity_positions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'poolId',
            type: 'uuid',
          },
          {
            name: 'ownerAddress',
            type: 'varchar',
          },
          {
            name: 'positionType',
            type: 'enum',
            enum: ['standard', 'concentrated'],
          },
          {
            name: 'tokenAAmount',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'tokenBAmount',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'liquidityShares',
            type: 'decimal',
            precision: 36,
            scale: 9,
          },
          {
            name: 'lowerPrice',
            type: 'decimal',
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'upperPrice',
            type: 'decimal',
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'feeEarnedA',
            type: 'decimal',
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'feeEarnedB',
            type: 'decimal',
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: 'positionNftMint',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
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
        foreignKeys: [
          {
            columnNames: ['poolId'],
            referencedTableName: 'dex_pools',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'dex_pools',
      new TableIndex({
        name: 'IDX_DEX_POOLS_ADDRESS',
        columnNames: ['poolAddress'],
      }),
    );

    await queryRunner.createIndex(
      'dex_pools',
      new TableIndex({
        name: 'IDX_DEX_POOLS_TOKENS',
        columnNames: ['tokenAMint', 'tokenBMint'],
      }),
    );

    await queryRunner.createIndex(
      'dex_swaps',
      new TableIndex({
        name: 'IDX_DEX_SWAPS_SIGNATURE',
        columnNames: ['transactionSignature'],
      }),
    );

    await queryRunner.createIndex(
      'dex_swaps',
      new TableIndex({
        name: 'IDX_DEX_SWAPS_POOL_USER',
        columnNames: ['poolId', 'userAddress'],
      }),
    );

    await queryRunner.createIndex(
      'dex_swaps',
      new TableIndex({
        name: 'IDX_DEX_SWAPS_CREATED_AT',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'dex_liquidity_positions',
      new TableIndex({
        name: 'IDX_DEX_POSITIONS_POOL_OWNER',
        columnNames: ['poolId', 'ownerAddress'],
      }),
    );

    await queryRunner.createIndex(
      'dex_liquidity_positions',
      new TableIndex({
        name: 'IDX_DEX_POSITIONS_OWNER',
        columnNames: ['ownerAddress'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('dex_liquidity_positions');
    await queryRunner.dropTable('dex_swaps');
    await queryRunner.dropTable('dex_pools');
  }
}
