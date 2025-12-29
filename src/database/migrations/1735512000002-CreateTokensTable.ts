import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateTokensTable1735512000002 implements MigrationInterface {
  name = "CreateTokensTable";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tokens table
    await queryRunner.createTable(
      new Table({
        name: "tokens",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "mintAddress",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "symbol",
            type: "varchar",
          },
          {
            name: "decimals",
            type: "int",
          },
          {
            name: "supply",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "owner",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "isNft",
            type: "boolean",
            default: false,
          },
          {
            name: "metadata",
            type: "jsonb",
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
      }),
    );

    // Create indexes for performance
    await queryRunner.createIndex(
      "tokens",
      new TableIndex({
        name: "IDX_tokens_mint_address",
        columnNames: ["mintAddress"],
      }),
    );

    await queryRunner.createIndex(
      "tokens",
      new TableIndex({
        name: "IDX_tokens_symbol",
        columnNames: ["symbol"],
      }),
    );

    await queryRunner.createIndex(
      "tokens",
      new TableIndex({
        name: "IDX_tokens_owner",
        columnNames: ["owner"],
      }),
    );

    await queryRunner.createIndex(
      "tokens",
      new TableIndex({
        name: "IDX_tokens_is_nft",
        columnNames: ["isNft"],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex("tokens", "IDX_tokens_is_nft");
    await queryRunner.dropIndex("tokens", "IDX_tokens_owner");
    await queryRunner.dropIndex("tokens", "IDX_tokens_symbol");
    await queryRunner.dropIndex("tokens", "IDX_tokens_mint_address");

    // Drop table
    await queryRunner.dropTable("tokens");
  }
}
