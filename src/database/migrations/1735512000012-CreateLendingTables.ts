import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateLendingTables1735512000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create lending_pools table
    await queryRunner.createTable(
      new Table({
        name: "lending_pools",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "poolAddress",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "poolType",
            type: "enum",
            enum: ["standard", "isolated"],
          },
          {
            name: "lendingProgramId",
            type: "varchar",
          },
          {
            name: "ownerAddress",
            type: "varchar",
          },
          {
            name: "reserves",
            type: "jsonb",
          },
          {
            name: "totalValueLocked",
            type: "decimal",
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: "oracleProgramId",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "isActive",
            type: "boolean",
            default: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Create lending_positions table
    await queryRunner.createTable(
      new Table({
        name: "lending_positions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "poolId",
            type: "uuid",
          },
          {
            name: "userAddress",
            type: "varchar",
          },
          {
            name: "positionType",
            type: "enum",
            enum: ["supply", "borrow"],
          },
          {
            name: "assetMint",
            type: "varchar",
          },
          {
            name: "amount",
            type: "decimal",
            precision: 36,
            scale: 9,
          },
          {
            name: "accruedInterest",
            type: "decimal",
            precision: 36,
            scale: 9,
            isNullable: true,
          },
          {
            name: "apy",
            type: "decimal",
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: "status",
            type: "enum",
            enum: ["active", "liquidated", "closed"],
            default: "'active'",
          },
          {
            name: "obligationAddress",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "healthFactor",
            type: "decimal",
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: "liquidationPrice",
            type: "decimal",
            precision: 18,
            scale: 9,
            isNullable: true,
          },
          {
            name: "collateralInfo",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "lastUpdateSlot",
            type: "int",
            isNullable: true,
          },
          {
            name: "createdAt",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updatedAt",
            type: "timestamp",
            default: "now()",
          },
        ],
        foreignKeys: [
          {
            columnNames: ["poolId"],
            referencedTableName: "lending_pools",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      "lending_pools",
      new TableIndex({
        name: "IDX_LENDING_POOLS_ADDRESS",
        columnNames: ["poolAddress"],
      }),
    );

    await queryRunner.createIndex(
      "lending_pools",
      new TableIndex({
        name: "IDX_LENDING_POOLS_PROGRAM",
        columnNames: ["lendingProgramId"],
      }),
    );

    await queryRunner.createIndex(
      "lending_positions",
      new TableIndex({
        name: "IDX_LENDING_POSITIONS_POOL_USER",
        columnNames: ["poolId", "userAddress"],
      }),
    );

    await queryRunner.createIndex(
      "lending_positions",
      new TableIndex({
        name: "IDX_LENDING_POSITIONS_USER",
        columnNames: ["userAddress"],
      }),
    );

    await queryRunner.createIndex(
      "lending_positions",
      new TableIndex({
        name: "IDX_LENDING_POSITIONS_TYPE",
        columnNames: ["positionType"],
      }),
    );

    await queryRunner.createIndex(
      "lending_positions",
      new TableIndex({
        name: "IDX_LENDING_POSITIONS_STATUS",
        columnNames: ["status"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("lending_positions");
    await queryRunner.dropTable("lending_pools");
  }
}