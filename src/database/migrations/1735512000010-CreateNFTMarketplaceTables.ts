import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateNFTMarketplaceTables1735512000010 implements MigrationInterface {
  name = "CreateNFTMarketplaceTables";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create nft_listings table
    await queryRunner.createTable(
      new Table({
        name: "nft_listings",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "nft_mint_address",
            type: "varchar",
          },
          {
            name: "seller_address",
            type: "varchar",
          },
          {
            name: "listing_type",
            type: "varchar",
          },
          {
            name: "price",
            type: "decimal",
            precision: 20,
            scale: 9,
          },
          {
            name: "currency_mint",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            default: "'active'",
          },
          {
            name: "royalty_percentage",
            type: "decimal",
            precision: 5,
            scale: 2,
            default: "0",
          },
          {
            name: "royalty_recipient",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "auction_end_time",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "marketplace_fee",
            type: "decimal",
            precision: 5,
            scale: 2,
            default: "2.00",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Create nft_bids table
    await queryRunner.createTable(
      new Table({
        name: "nft_bids",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "listing_id",
            type: "uuid",
          },
          {
            name: "bidder_address",
            type: "varchar",
          },
          {
            name: "amount",
            type: "decimal",
            precision: 20,
            scale: 9,
          },
          {
            name: "currency_mint",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "status",
            type: "varchar",
            default: "'active'",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Create nft_sales table
    await queryRunner.createTable(
      new Table({
        name: "nft_sales",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "nft_mint_address",
            type: "varchar",
          },
          {
            name: "seller_address",
            type: "varchar",
          },
          {
            name: "buyer_address",
            type: "varchar",
          },
          {
            name: "price",
            type: "decimal",
            precision: 20,
            scale: 9,
          },
          {
            name: "currency_mint",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "royalty_amount",
            type: "decimal",
            precision: 20,
            scale: 9,
            default: "0",
          },
          {
            name: "marketplace_fee",
            type: "decimal",
            precision: 20,
            scale: 9,
            default: "0",
          },
          {
            name: "transaction_signature",
            type: "varchar",
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      "nft_listings",
      new TableIndex({
        name: "IDX_nft_listings_nft_mint",
        columnNames: ["nft_mint_address"],
      }),
    );

    await queryRunner.createIndex(
      "nft_listings",
      new TableIndex({
        name: "IDX_nft_listings_seller",
        columnNames: ["seller_address"],
      }),
    );

    await queryRunner.createIndex(
      "nft_listings",
      new TableIndex({
        name: "IDX_nft_listings_status",
        columnNames: ["status"],
      }),
    );

    await queryRunner.createIndex(
      "nft_bids",
      new TableIndex({
        name: "IDX_nft_bids_listing",
        columnNames: ["listing_id"],
      }),
    );

    await queryRunner.createIndex(
      "nft_bids",
      new TableIndex({
        name: "IDX_nft_bids_bidder",
        columnNames: ["bidder_address"],
      }),
    );

    await queryRunner.createIndex(
      "nft_sales",
      new TableIndex({
        name: "IDX_nft_sales_nft_mint",
        columnNames: ["nft_mint_address"],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      "nft_bids",
      new TableForeignKey({
        columnNames: ["listing_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "nft_listings",
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const bidTable = await queryRunner.getTable("nft_bids");
    const listingForeignKey = bidTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("listing_id") !== -1,
    );
    if (listingForeignKey) {
      await queryRunner.dropForeignKey("nft_bids", listingForeignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex("nft_sales", "IDX_nft_sales_nft_mint");
    await queryRunner.dropIndex("nft_bids", "IDX_nft_bids_bidder");
    await queryRunner.dropIndex("nft_bids", "IDX_nft_bids_listing");
    await queryRunner.dropIndex("nft_listings", "IDX_nft_listings_status");
    await queryRunner.dropIndex("nft_listings", "IDX_nft_listings_seller");
    await queryRunner.dropIndex("nft_listings", "IDX_nft_listings_nft_mint");

    // Drop tables
    await queryRunner.dropTable("nft_sales");
    await queryRunner.dropTable("nft_bids");
    await queryRunner.dropTable("nft_listings");
  }
}