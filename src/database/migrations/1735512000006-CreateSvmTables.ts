import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class CreateSvmTables1735512000006 implements MigrationInterface {
  name = "CreateSvmTables1735512000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create programs table
    await queryRunner.createTable(
      new Table({
        name: "programs",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "program_id",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "owner",
            type: "varchar",
          },
          {
            name: "name",
            type: "varchar",
          },
          {
            name: "description",
            type: "text",
            isNullable: true,
          },
          {
            name: "program_type",
            type: "enum",
            enum: ["system", "token", "custom", "library"],
            default: "'custom'",
          },
          {
            name: "status",
            type: "enum",
            enum: ["deploying", "active", "suspended", "deprecated"],
            default: "'deploying'",
          },
          {
            name: "bytecode",
            type: "text",
            isNullable: true,
          },
          {
            name: "size_bytes",
            type: "bigint",
            default: 0,
          },
          {
            name: "deployment_slot",
            type: "bigint",
            isNullable: true,
          },
          {
            name: "version",
            type: "varchar",
            default: "'1.0.0'",
          },
          {
            name: "max_compute_units",
            type: "int",
            default: 200000,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
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

    // Create runtime_executions table
    await queryRunner.createTable(
      new Table({
        name: "runtime_executions",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "program_id",
            type: "varchar",
          },
          {
            name: "transaction_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "instruction_index",
            type: "int",
            default: 0,
          },
          {
            name: "execution_type",
            type: "enum",
            enum: ["instruction", "cpi", "internal"],
            default: "'instruction'",
          },
          {
            name: "status",
            type: "enum",
            enum: ["pending", "running", "success", "failed", "timeout"],
            default: "'pending'",
          },
          {
            name: "compute_units_used",
            type: "bigint",
            default: 0,
          },
          {
            name: "compute_units_allocated",
            type: "bigint",
            default: 200000,
          },
          {
            name: "execution_time_ms",
            type: "int",
            isNullable: true,
          },
          {
            name: "memory_usage_bytes",
            type: "bigint",
            default: 0,
          },
          {
            name: "gas_cost",
            type: "bigint",
            default: 0,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "logs",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "accounts_accessed",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "slot_number",
            type: "bigint",
            isNullable: true,
          },
          {
            name: "block_hash",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "metadata",
            type: "jsonb",
            isNullable: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
          },
        ],
      }),
    );

    // Create gas_meters table
    await queryRunner.createTable(
      new Table({
        name: "gas_meters",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "program_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "account_id",
            type: "varchar",
            isNullable: true,
          },
          {
            name: "meter_type",
            type: "enum",
            enum: ["instruction", "program", "transaction", "block"],
            default: "'program'",
          },
          {
            name: "status",
            type: "enum",
            enum: ["active", "paused", "exceeded"],
            default: "'active'",
          },
          {
            name: "gas_allocated",
            type: "bigint",
            default: 1000000,
          },
          {
            name: "gas_used",
            type: "bigint",
            default: 0,
          },
          {
            name: "gas_remaining",
            type: "bigint",
            default: 1000000,
          },
          {
            name: "gas_limit_per_operation",
            type: "bigint",
            default: 200000,
          },
          {
            name: "reset_period_seconds",
            type: "bigint",
            default: 0,
          },
          {
            name: "last_reset_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "next_reset_at",
            type: "timestamp",
            isNullable: true,
          },
          {
            name: "operation_count",
            type: "bigint",
            default: 0,
          },
          {
            name: "average_gas_per_operation",
            type: "bigint",
            default: 0,
          },
          {
            name: "peak_gas_usage",
            type: "bigint",
            default: 0,
          },
          {
            name: "efficiency_rating",
            type: "int",
            default: 100,
          },
          {
            name: "alert_threshold_percent",
            type: "int",
            default: 80,
          },
          {
            name: "auto_pause_on_threshold",
            type: "boolean",
            default: false,
          },
          {
            name: "configuration",
            type: "jsonb",
            isNullable: true,
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

    // Create indexes for performance
    await queryRunner.createIndex(
      "programs",
      new TableIndex({
        name: "IDX_programs_program_id",
        columnNames: ["program_id"],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      "programs",
      new TableIndex({
        name: "IDX_programs_owner",
        columnNames: ["owner"],
      }),
    );

    await queryRunner.createIndex(
      "runtime_executions",
      new TableIndex({
        name: "IDX_runtime_executions_program_id",
        columnNames: ["program_id"],
      }),
    );

    await queryRunner.createIndex(
      "runtime_executions",
      new TableIndex({
        name: "IDX_runtime_executions_transaction_id",
        columnNames: ["transaction_id"],
      }),
    );

    await queryRunner.createIndex(
      "runtime_executions",
      new TableIndex({
        name: "IDX_runtime_executions_status",
        columnNames: ["status"],
      }),
    );

    await queryRunner.createIndex(
      "runtime_executions",
      new TableIndex({
        name: "IDX_runtime_executions_created_at",
        columnNames: ["created_at"],
      }),
    );

    await queryRunner.createIndex(
      "gas_meters",
      new TableIndex({
        name: "IDX_gas_meters_program_id",
        columnNames: ["program_id"],
      }),
    );

    await queryRunner.createIndex(
      "gas_meters",
      new TableIndex({
        name: "IDX_gas_meters_account_id",
        columnNames: ["account_id"],
      }),
    );

    await queryRunner.createIndex(
      "gas_meters",
      new TableIndex({
        name: "IDX_gas_meters_meter_type",
        columnNames: ["meter_type"],
      }),
    );

    await queryRunner.createIndex(
      "gas_meters",
      new TableIndex({
        name: "IDX_gas_meters_status",
        columnNames: ["status"],
      }),
    );

    // Create foreign key relationships
    await queryRunner.createForeignKey(
      "runtime_executions",
      new TableForeignKey({
        columnNames: ["program_id"],
        referencedColumnNames: ["program_id"],
        referencedTableName: "programs",
        onDelete: "CASCADE",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const runtimeExecutionsTable =
      await queryRunner.getTable("runtime_executions");
    const programForeignKey = runtimeExecutionsTable.foreignKeys.find(
      (fk) => fk.columnNames.indexOf("program_id") !== -1,
    );
    if (programForeignKey) {
      await queryRunner.dropForeignKey("runtime_executions", programForeignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex("gas_meters", "IDX_gas_meters_status");
    await queryRunner.dropIndex("gas_meters", "IDX_gas_meters_meter_type");
    await queryRunner.dropIndex("gas_meters", "IDX_gas_meters_account_id");
    await queryRunner.dropIndex("gas_meters", "IDX_gas_meters_program_id");
    await queryRunner.dropIndex(
      "runtime_executions",
      "IDX_runtime_executions_created_at",
    );
    await queryRunner.dropIndex(
      "runtime_executions",
      "IDX_runtime_executions_status",
    );
    await queryRunner.dropIndex(
      "runtime_executions",
      "IDX_runtime_executions_transaction_id",
    );
    await queryRunner.dropIndex(
      "runtime_executions",
      "IDX_runtime_executions_program_id",
    );
    await queryRunner.dropIndex("programs", "IDX_programs_owner");
    await queryRunner.dropIndex("programs", "IDX_programs_program_id");

    // Drop tables
    await queryRunner.dropTable("gas_meters");
    await queryRunner.dropTable("runtime_executions");
    await queryRunner.dropTable("programs");
  }
}
