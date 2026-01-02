import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MigrationService, MigrationInfo, MigrationResult } from '../migration.service';

// Mock DataSource
const mockDataSource = {
  migrations: [
    {
      name: '1735512000000-CreateAccountsTable',
      constructor: { name: 'CreateAccountsTable1735512000000' },
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    },
    {
      name: '1735512000001-CreateTransactionsTable',
      constructor: { name: 'CreateTransactionsTable1735512000001' },
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
    },
  ] as any[],
  createQueryRunner: jest.fn().mockReturnValue({
    // Mock query runner methods as needed
  }),
  query: jest.fn(),
};

describe('MigrationService', () => {
  let service: MigrationService;
  let dataSource: DataSource;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<MigrationService>(MigrationService);
    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMigrations', () => {
    it('should return all migrations with their status', async () => {
      mockDataSource.query.mockResolvedValue([{ name: '1735512000000-CreateAccountsTable' }]);

      const result = await service.getMigrations();

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('name', '1735512000000-CreateAccountsTable');
      expect(result[0]).toHaveProperty('timestamp', 1735512000000);
      expect(result[0]).toHaveProperty('executed', true);
      expect(result[1]).toHaveProperty('executed', false);
    });

    it('should sort migrations by timestamp', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getMigrations();

      expect(result[0].timestamp).toBeLessThan(result[1].timestamp);
    });
  });

  describe('runMigrations', () => {
    it('should run pending migrations successfully', async () => {
      mockDataSource.query.mockResolvedValue([{ name: '1735512000000-CreateAccountsTable' }]);

      const result = await service.runMigrations();

      expect(result.success).toBe(true);
      expect(result.executedMigrations).toHaveLength(1);
      expect(result.executedMigrations[0]).toBe('1735512000001-CreateTransactionsTable');
      expect(result.failedMigrations).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle migration failures', async () => {
      mockDataSource.query.mockResolvedValue([]);
      const mockMigration = mockDataSource.migrations[0];
      mockMigration.up.mockRejectedValue(new Error('Migration failed'));

      const result = await service.runMigrations();

      expect(result.success).toBe(false);
      expect(result.executedMigrations).toHaveLength(0);
      expect(result.failedMigrations).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Migration failed');
    });
  });

  describe('rollbackMigration', () => {
    it('should rollback the last executed migration', async () => {
      mockDataSource.query.mockResolvedValue([
        { name: '1735512000000-CreateAccountsTable' },
        { name: '1735512000001-CreateTransactionsTable' },
      ]);

      const result = await service.rollbackMigration();

      expect(result.success).toBe(true);
      expect(result.executedMigrations).toHaveLength(1);
      expect(result.executedMigrations[0]).toBe('1735512000001-CreateTransactionsTable');
    });

    it('should handle no migrations to rollback', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.rollbackMigration();

      expect(result.success).toBe(true);
      expect(result.executedMigrations).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('No migrations to rollback');
    });
  });

  describe('createMigration', () => {
    const fs = require('fs');
    const path = require('path');

    beforeEach(() => {
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a new migration file', async () => {
      const migrationName = 'AddUserTable';
      const result = await service.createMigration(migrationName);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result).toContain(migrationName);
      expect(result).toContain('.ts');
    });
  });

  describe('getMigrationStats', () => {
    it('should return migration statistics', async () => {
      mockDataSource.query.mockResolvedValue([{ name: '1735512000000-CreateAccountsTable' }]);

      const result = await service.getMigrationStats();

      expect(result).toHaveProperty('total', 2);
      expect(result).toHaveProperty('executed', 1);
      expect(result).toHaveProperty('pending', 1);
      expect(result).toHaveProperty('lastExecuted', '1735512000000-CreateAccountsTable');
    });

    it('should handle no executed migrations', async () => {
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getMigrationStats();

      expect(result.total).toBe(2);
      expect(result.executed).toBe(0);
      expect(result.pending).toBe(2);
      expect(result.lastExecuted).toBeUndefined();
    });
  });

  describe('validateFeeEstimate', () => {
    it('should validate migration data integrity', async () => {
      // Test that migrations have required properties
      const migrations = await service.getMigrations();

      migrations.forEach((migration) => {
        expect(migration).toHaveProperty('name');
        expect(migration).toHaveProperty('timestamp');
        expect(typeof migration.timestamp).toBe('number');
        expect(migration.timestamp).toBeGreaterThan(0);
        expect(migration).toHaveProperty('executed');
        expect(typeof migration.executed).toBe('boolean');
      });
    });
  });

  describe('Migration file structure', () => {
    it('should have properly structured migration files', () => {
      const migrations = mockDataSource.migrations;

      migrations.forEach((migration) => {
        expect(migration).toHaveProperty('name');
        expect(migration).toHaveProperty('up');
        expect(migration).toHaveProperty('down');
        expect(typeof migration.up).toBe('function');
        expect(typeof migration.down).toBe('function');
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database query failures gracefully', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getMigrations();

      // Should still return migrations but all marked as not executed
      expect(result).toHaveLength(2);
      expect(result.every((m) => m.executed === false)).toBe(true);
    });

    it('should handle migration execution errors', async () => {
      mockDataSource.query.mockResolvedValue([]);
      mockDataSource.migrations[0].up.mockRejectedValue(new Error('Table creation failed'));

      const result = await service.runMigrations();

      expect(result.success).toBe(false);
      expect(result.failedMigrations).toContain('1735512000000-CreateAccountsTable');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
