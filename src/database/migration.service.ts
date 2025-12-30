import { Injectable } from '@nestjs/common';
import { DataSource, MigrationInterface, QueryRunner } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

export interface MigrationInfo {
  name: string;
  timestamp: number;
  executed: boolean;
  executionTime?: number;
}

export interface MigrationResult {
  success: boolean;
  executedMigrations: string[];
  failedMigrations: string[];
  errors: string[];
}

@Injectable()
export class MigrationService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Get all available migrations
   */
  async getMigrations(): Promise<MigrationInfo[]> {
    const migrations = this.dataSource.migrations as MigrationInterface[];
    const executedMigrations = await this.getExecutedMigrations();

    return migrations.map(migration => {
      const migrationName = this.getMigrationName(migration);
      const timestamp = this.extractTimestamp(migrationName);

      return {
        name: migrationName,
        timestamp,
        executed: executedMigrations.includes(migrationName),
      };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      executedMigrations: [],
      failedMigrations: [],
      errors: [],
    };

    try {
      // Get pending migrations
      const pendingMigrations = await this.getPendingMigrations();

      for (const migration of pendingMigrations) {
        try {
          const startTime = Date.now();
          await migration.up(this.dataSource.createQueryRunner());
          const executionTime = Date.now() - startTime;

          result.executedMigrations.push(this.getMigrationName(migration));

          // Log successful migration
          console.log(`✅ Migration ${this.getMigrationName(migration)} executed successfully in ${executionTime}ms`);
        } catch (error) {
          result.success = false;
          result.failedMigrations.push(this.getMigrationName(migration));
          result.errors.push(`Migration ${this.getMigrationName(migration)} failed: ${error.message}`);

          console.error(`❌ Migration ${this.getMigrationName(migration)} failed:`, error);
          break; // Stop on first failure
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration execution failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Rollback last migration
   */
  async rollbackMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      executedMigrations: [],
      failedMigrations: [],
      errors: [],
    };

    try {
      const executedMigrations = await this.getExecutedMigrations();

      if (executedMigrations.length === 0) {
        result.errors.push('No migrations to rollback');
        return result;
      }

      // Get the last executed migration
      const lastMigrationName = executedMigrations[executedMigrations.length - 1];
      const migration = this.findMigrationByName(lastMigrationName);

      if (!migration) {
        result.errors.push(`Migration ${lastMigrationName} not found`);
        return result;
      }

      try {
        await migration.down(this.dataSource.createQueryRunner());
        result.executedMigrations.push(lastMigrationName);
        console.log(`✅ Migration ${lastMigrationName} rolled back successfully`);
      } catch (error) {
        result.success = false;
        result.failedMigrations.push(lastMigrationName);
        result.errors.push(`Rollback of ${lastMigrationName} failed: ${error.message}`);
        console.error(`❌ Rollback of ${lastMigrationName} failed:`, error);
      }
    } catch (error) {
      result.success = false;
      result.errors.push(`Migration rollback failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${name}.ts`;
    const filePath = path.join(__dirname, 'migrations', fileName);

    const migrationTemplate = `import { MigrationInterface, QueryRunner } from 'typeorm';

export class ${this.toPascalCase(name)}${timestamp} implements MigrationInterface {
  name = '${name}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add migration logic here
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add rollback logic here
  }
}
`;

    fs.writeFileSync(filePath, migrationTemplate);
    console.log(`✅ Migration file created: ${filePath}`);

    return filePath;
  }

  /**
   * Get pending migrations
   */
  private async getPendingMigrations(): Promise<MigrationInterface[]> {
    const allMigrations = this.dataSource.migrations as MigrationInterface[];
    const executedMigrations = await this.getExecutedMigrations();

    return allMigrations.filter(migration =>
      !executedMigrations.includes(this.getMigrationName(migration))
    );
  }

  /**
   * Get executed migrations from database
   */
  private async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT name FROM migrations
        ORDER BY id ASC
      `);
      return result.map(row => row.name);
    } catch (error) {
      // Migrations table might not exist yet
      return [];
    }
  }

  /**
   * Find migration by name
   */
  private findMigrationByName(name: string): MigrationInterface | undefined {
    const migrations = this.dataSource.migrations as MigrationInterface[];
    return migrations.find(migration => this.getMigrationName(migration) === name);
  }

  /**
   * Get migration name
   */
  private getMigrationName(migration: MigrationInterface): string {
    return (migration as any).name || migration.constructor.name;
  }

  /**
   * Extract timestamp from migration name
   */
  private extractTimestamp(migrationName: string): number {
    const match = migrationName.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Convert string to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  /**
   * Get migration statistics
   */
  async getMigrationStats(): Promise<{
    total: number;
    executed: number;
    pending: number;
    lastExecuted?: string;
  }> {
    const migrations = await this.getMigrations();
    const executed = migrations.filter(m => m.executed);
    const pending = migrations.filter(m => !m.executed);

    return {
      total: migrations.length,
      executed: executed.length,
      pending: pending.length,
      lastExecuted: executed.length > 0 ? executed[executed.length - 1].name : undefined,
    };
  }
}