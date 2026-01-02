import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCpiTables1735512000007 implements MigrationInterface {
  name = 'CreateCpiTables1735512000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create cpi_instructions table
    await queryRunner.createTable(
      new Table({
        name: 'cpi_instructions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'caller_program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'instruction_data',
            type: 'jsonb',
          },
          {
            name: 'accounts',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'method_name',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'requires_permission',
            type: 'boolean',
            default: false,
          },
          {
            name: 'permission_program_id',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'permission_level',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create cpi_permissions table
    await queryRunner.createTable(
      new Table({
        name: 'cpi_permissions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'granter_program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'account_id',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'permission_type',
            type: 'varchar',
            length: '64',
          },
          {
            name: 'constraints',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create cpi_invocations table
    await queryRunner.createTable(
      new Table({
        name: 'cpi_invocations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'transaction_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'caller_program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'target_program_id',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'instruction_name',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'instruction_data',
            type: 'jsonb',
          },
          {
            name: 'accounts',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'gas_used',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'return_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'cpi_instructions',
      new TableIndex({
        name: 'IDX_cpi_instructions_program_id',
        columnNames: ['program_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_instructions',
      new TableIndex({
        name: 'IDX_cpi_instructions_caller_program_id',
        columnNames: ['caller_program_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_permissions',
      new TableIndex({
        name: 'IDX_cpi_permissions_program_id',
        columnNames: ['program_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_permissions',
      new TableIndex({
        name: 'IDX_cpi_permissions_granter_program_id',
        columnNames: ['granter_program_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_permissions',
      new TableIndex({
        name: 'IDX_cpi_permissions_account_id',
        columnNames: ['account_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_invocations',
      new TableIndex({
        name: 'IDX_cpi_invocations_transaction_id',
        columnNames: ['transaction_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_invocations',
      new TableIndex({
        name: 'IDX_cpi_invocations_caller_program_id',
        columnNames: ['caller_program_id'],
      }),
    );

    await queryRunner.createIndex(
      'cpi_invocations',
      new TableIndex({
        name: 'IDX_cpi_invocations_target_program_id',
        columnNames: ['target_program_id'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'cpi_instructions',
      new TableForeignKey({
        columnNames: ['program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_instructions',
      new TableForeignKey({
        columnNames: ['caller_program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_permissions',
      new TableForeignKey({
        columnNames: ['program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_permissions',
      new TableForeignKey({
        columnNames: ['granter_program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_invocations',
      new TableForeignKey({
        columnNames: ['caller_program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_invocations',
      new TableForeignKey({
        columnNames: ['target_program_id'],
        referencedColumnNames: ['program_id'],
        referencedTableName: 'programs',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cpi_invocations',
      new TableForeignKey({
        columnNames: ['transaction_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'runtime_executions',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const cpiInvocationsTable = await queryRunner.getTable('cpi_invocations');
    const cpiPermissionsTable = await queryRunner.getTable('cpi_permissions');
    const cpiInstructionsTable = await queryRunner.getTable('cpi_instructions');

    const cpiInvocationsForeignKeys = cpiInvocationsTable.foreignKeys;
    const cpiPermissionsForeignKeys = cpiPermissionsTable.foreignKeys;
    const cpiInstructionsForeignKeys = cpiInstructionsTable.foreignKeys;

    for (const foreignKey of cpiInvocationsForeignKeys) {
      await queryRunner.dropForeignKey('cpi_invocations', foreignKey);
    }

    for (const foreignKey of cpiPermissionsForeignKeys) {
      await queryRunner.dropForeignKey('cpi_permissions', foreignKey);
    }

    for (const foreignKey of cpiInstructionsForeignKeys) {
      await queryRunner.dropForeignKey('cpi_instructions', foreignKey);
    }

    // Drop indexes
    await queryRunner.dropIndex('cpi_invocations', 'IDX_cpi_invocations_target_program_id');
    await queryRunner.dropIndex('cpi_invocations', 'IDX_cpi_invocations_caller_program_id');
    await queryRunner.dropIndex('cpi_invocations', 'IDX_cpi_invocations_transaction_id');
    await queryRunner.dropIndex('cpi_permissions', 'IDX_cpi_permissions_account_id');
    await queryRunner.dropIndex('cpi_permissions', 'IDX_cpi_permissions_granter_program_id');
    await queryRunner.dropIndex('cpi_permissions', 'IDX_cpi_permissions_program_id');
    await queryRunner.dropIndex('cpi_instructions', 'IDX_cpi_instructions_caller_program_id');
    await queryRunner.dropIndex('cpi_instructions', 'IDX_cpi_instructions_program_id');

    // Drop tables
    await queryRunner.dropTable('cpi_invocations');
    await queryRunner.dropTable('cpi_permissions');
    await queryRunner.dropTable('cpi_instructions');
  }
}
