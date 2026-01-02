import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { MigrationService, MigrationInfo, MigrationResult } from './migration.service';

/**
 * # Migration Controller
 *
 * REST API for managing TypeORM database migrations.
 *
 * ## Migration Workflow
 *
 * ```
 * [Create Migration] → migration file generated
 *          ↓
 * [Edit Migration] → add up/down SQL
 *          ↓
 * [Run Migrations] → apply to database
 *          ↓
 * [Record in migrations table]
 * ```
 *
 * ## Migration States
 *
 * | State | Description |
 * |-------|-------------|
 * | Pending | Not yet applied |
 * | Executed | Successfully applied |
 * | Failed | Error during execution |
 *
 * ## Best Practices
 *
 * - Always test migrations on devnet first
 * - Include rollback (down) logic
 * - Use transactions for atomicity
 * - Backup before production migrations
 *
 * @example
 * ```bash
 * # List all migrations
 * curl http://localhost:3000/migrations
 *
 * # Run pending migrations
 * curl -X POST http://localhost:3000/migrations/run
 *
 * # Rollback last migration
 * curl -X POST http://localhost:3000/migrations/rollback
 *
 * # Create new migration
 * curl -X POST http://localhost:3000/migrations/create \
 *   -H "Content-Type: application/json" \
 *   -d '{"name": "AddTransactionIndex"}'
 * ```
 */
@ApiTags('Migrations')
@Controller('migrations')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  /**
   * Get all migrations with their execution status.
   */
  @Get()
  @ApiOperation({
    summary: 'Get all migrations',
    description: 'List all migrations and their current status (pending/executed).',
  })
  @ApiResponse({
    status: 200,
    description: 'Migrations retrieved successfully',
  })
  async getMigrations(): Promise<MigrationInfo[]> {
    return this.migrationService.getMigrations();
  }

  /**
   * Get migration statistics summary.
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get migration statistics',
    description: 'Returns counts of pending, executed, and total migrations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getMigrationStats() {
    return this.migrationService.getMigrationStats();
  }

  /**
   * Run all pending migrations.
   *
   * Executes migrations in order and records them in the migrations table.
   */
  @Post('run')
  @ApiOperation({
    summary: 'Run pending migrations',
    description: 'Execute all pending migrations in sequence.',
  })
  @ApiResponse({
    status: 201,
    description: 'Migrations executed successfully',
  })
  async runMigrations(): Promise<MigrationResult> {
    return this.migrationService.runMigrations();
  }

  /**
   * Rollback the last executed migration.
   *
   * Runs the 'down' method of the most recent migration.
   */
  @Post('rollback')
  @ApiOperation({
    summary: 'Rollback last migration',
    description: 'Revert the most recently executed migration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Migration rolled back successfully',
  })
  async rollbackMigration(): Promise<MigrationResult> {
    return this.migrationService.rollbackMigration();
  }

  /**
   * Create a new migration file.
   *
   * Generates a timestamped migration file in the migrations directory.
   */
  @Post('create')
  @ApiOperation({
    summary: 'Create new migration',
    description: 'Generate a new migration file with the given name.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'AddTransactionIndex' },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Migration file created successfully',
  })
  async createMigration(@Body() body: { name: string }): Promise<string> {
    return this.migrationService.createMigration(body.name);
  }
}
