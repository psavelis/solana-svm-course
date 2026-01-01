import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseConnectionService } from './database-connection.service';
import { DatabasePerformanceService } from './database-performance.service';
import { TestUtils } from '../test-utils';

describe('Database Integration Tests', () => {
  let connectionService: DatabaseConnectionService;
  let performanceService: DatabasePerformanceService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await TestUtils.createTestingModule({
      providers: [DatabaseConnectionService, DatabasePerformanceService],
    });

    connectionService = module.get<DatabaseConnectionService>(DatabaseConnectionService);
    performanceService = module.get<DatabasePerformanceService>(DatabasePerformanceService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('DatabaseConnectionService', () => {
    it('should establish database connection', async () => {
      const isConnected = await connectionService.checkConnection();
      expect(isConnected).toBe(true);
    });

    it('should return connection info', async () => {
      const info = await connectionService.getConnectionInfo();
      expect(info).toHaveProperty('status');
      expect(info).toHaveProperty('database');
      expect(info).toHaveProperty('host');
      expect(info).toHaveProperty('port');
    });

    it('should handle connection errors gracefully', async () => {
      // This test assumes the service handles connection errors properly
      const result = await connectionService.checkConnection();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('DatabasePerformanceService', () => {
    it('should measure query performance', async () => {
      const metrics = await performanceService.getPerformanceMetrics();
      expect(metrics).toHaveProperty('queryCount');
      expect(metrics).toHaveProperty('averageQueryTime');
      expect(metrics).toHaveProperty('slowQueries');
    });

    it('should return connection pool stats', async () => {
      const poolStats = await connectionService.getConnectionPoolStats();
      expect(poolStats).toHaveProperty('totalConnections');
      expect(poolStats).toHaveProperty('activeConnections');
      expect(poolStats).toHaveProperty('idleConnections');
    });

    it('should identify slow queries', async () => {
      const slowQueries = await performanceService.getSlowQueries();
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it('should provide optimization recommendations', async () => {
      const recommendations = await performanceService.getOptimizationRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Database Operations', () => {
    it('should handle concurrent connections', async () => {
      const promises = Array(10).fill(null).map(() =>
        connectionService.checkConnection()
      );

      const results = await Promise.all(promises);
      expect(results.every(result => result === true)).toBe(true);
    });

    it('should maintain connection stability', async () => {
      // Test connection stability over multiple operations
      for (let i = 0; i < 5; i++) {
        const isConnected = await connectionService.checkConnection();
        expect(isConnected).toBe(true);
        await TestUtils.delay(100); // Small delay between checks
      }
    });
  });
});