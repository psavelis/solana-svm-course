import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from "typeorm";

export class CreateSessionKeysTable1735512000009 implements MigrationInterface {
  name = "CreateSessionKeysTable";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create session_keys table
    await queryRunner.createTable(
      new Table({
        name: "session_keys",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "smart_account_address",
            type: "varchar",
          },
          {
            name: "session_key_address",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "permissions",
            type: "jsonb",
          },
          {
            name: "status",
            type: "varchar",
            default: "'active'",
          },
          {
            name: "expires_at",
            type: "timestamp",
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

    // Create indexes
    await queryRunner.createIndex(
      "session_keys",
      new TableIndex({
        name: "IDX_session_keys_smart_account",
        columnNames: ["smart_account_address"],
      }),
    );

    await queryRunner.createIndex(
      "session_keys",
      new TableIndex({
        name: "IDX_session_keys_status",
        columnNames: ["status"],
      }),
    );

    await queryRunner.createIndex(
      "session_keys",
      new TableIndex({
        name: "IDX_session_keys_expires_at",
        columnNames: ["expires_at"],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      "session_keys",
      new TableForeignKey({
        columnNames: ["smart_account_address"],
        referencedColumnNames: ["smart_account_address"],
        referencedTableName: "smart_accounts",
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable("session_keys");
    const foreignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("smart_account_address") !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey("session_keys", foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex("session_keys", "IDX_session_keys_expires_at");
    await queryRunner.dropIndex("session_keys", "IDX_session_keys_status");
    await queryRunner.dropIndex("session_keys", "IDX_session_keys_smart_account");

    // Drop table
    await queryRunner.dropTable("session_keys");
  }
}