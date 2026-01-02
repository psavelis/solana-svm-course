import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEventsTables1735512000008 implements MigrationInterface {
  name = 'CreateEventsTables1735512000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create events table
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_type',
            type: 'enum',
            enum: [
              'transaction_confirmed',
              'account_changed',
              'program_log',
              'cpi_invocation',
              'block_produced',
              'slot_updated',
            ],
          },
          {
            name: 'source',
            type: 'varchar',
            length: '88',
          },
          {
            name: 'data',
            type: 'jsonb',
          },
          {
            name: 'slot',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'signature',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'processed', 'failed'],
            default: "'pending'",
          },
          {
            name: 'error_message',
            type: 'text',
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

    // Create event_subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'event_subscriptions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'client_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'subscription_type',
            type: 'enum',
            enum: ['websocket', 'webhook', 'kafka'],
          },
          {
            name: 'filters',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'endpoint',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive', 'suspended'],
            default: "'active'",
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Create event_filters table
    await queryRunner.createTable(
      new Table({
        name: 'event_filters',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'owner_id',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'filter_type',
            type: 'enum',
            enum: ['account', 'program', 'transaction', 'slot', 'block'],
          },
          {
            name: 'account_id',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'program_id',
            type: 'varchar',
            length: '88',
            isNullable: true,
          },
          {
            name: 'criteria',
            type: 'jsonb',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['active', 'inactive'],
            default: "'active'",
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
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

    // Create indexes
    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_source',
        columnNames: ['source'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'event_subscriptions',
      new TableIndex({
        name: 'IDX_event_subscriptions_client_id',
        columnNames: ['client_id'],
      }),
    );

    await queryRunner.createIndex(
      'event_subscriptions',
      new TableIndex({
        name: 'IDX_event_subscriptions_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'event_subscriptions',
      new TableIndex({
        name: 'IDX_event_subscriptions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'event_filters',
      new TableIndex({
        name: 'IDX_event_filters_owner_id',
        columnNames: ['owner_id'],
      }),
    );

    await queryRunner.createIndex(
      'event_filters',
      new TableIndex({
        name: 'IDX_event_filters_filter_type',
        columnNames: ['filter_type'],
      }),
    );

    await queryRunner.createIndex(
      'event_filters',
      new TableIndex({
        name: 'IDX_event_filters_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('event_filters', 'IDX_event_filters_status');
    await queryRunner.dropIndex('event_filters', 'IDX_event_filters_filter_type');
    await queryRunner.dropIndex('event_filters', 'IDX_event_filters_owner_id');
    await queryRunner.dropIndex('event_subscriptions', 'IDX_event_subscriptions_status');
    await queryRunner.dropIndex('event_subscriptions', 'IDX_event_subscriptions_event_type');
    await queryRunner.dropIndex('event_subscriptions', 'IDX_event_subscriptions_client_id');
    await queryRunner.dropIndex('events', 'IDX_events_created_at');
    await queryRunner.dropIndex('events', 'IDX_events_source');
    await queryRunner.dropIndex('events', 'IDX_events_event_type');

    // Drop tables
    await queryRunner.dropTable('event_filters');
    await queryRunner.dropTable('event_subscriptions');
    await queryRunner.dropTable('events');
  }
}
