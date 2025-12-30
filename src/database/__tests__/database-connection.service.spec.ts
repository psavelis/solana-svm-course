import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/typeorm';
import { Connection } from 'typeorm';
import { DatabaseConnectionService } from '../database-connection.service';

describe('DatabaseConnectionService', () => {
  let service: DatabaseConnectionService;
  let mockConnection: Partial<Connection>;

  beforeEach(async () => {
    mockConnection = {
      name: 'test-connection',
      options: {
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'test_db',
      },
      isConnected: true,
      entityMetadatas: [
        { name: 'Account' } as any,
        { name: 'Transaction' } as any,
      ],
      createQueryRunner: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([{ result: 1 }]),
        release: jest.fn().mockResolvedValue(undefined),
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      }),
      driver: {
        pool: {
          totalCount: 10,
          borrowedCount: 5,
          availableCount: 5,
          pendingCount: 2,
          options: {
            min: 2,
            max: 20,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 60000,
          },
          closeIdle: jest.fn().mockResolvedValue(undefined),
        },
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseConnectionService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    service = module.get<DatabaseConnectionService>(DatabaseConnectionService);

    // Manually set startTime since onModuleInit won't run in test
    (service as any).startTime = new Date();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthStatus', () => {
    it('should return healthy status with pool information', async () => {
      const status = await service.getHealthStatus();

      expect(status.status).toBe('healthy');
      expect(status.connectionCount).toBe(10);
      expect(status.activeConnections).toBe(5);
      expect(status.idleConnections).toBe(5);
      expect(status.waitingClients).toBe(2);
      expect(status.poolConfig.min).toBe(2);
      expect(status.poolConfig.max).toBe(20);
    });

    it('should return unhealthy status when pool is not available', async () => {
      (mockConnection.driver as any).pool = null;

      const status = await service.getHealthStatus();

      expect(status.status).toBe('unhealthy');
      expect(status.connectionCount).toBe(0);
    });
  });

  describe('performHealthCheck', () => {
    it('should return true when query succeeds', async () => {
      const result = await service.performHealthCheck();
      expect(result).toBe(true);
    });

    it('should return false when query fails', async () => {
      const mockQueryRunner = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed')),
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockConnection.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      const result = await service.performHealthCheck();
      expect(result).toBe(false);
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      const stats = await service.getPoolStats();

      expect(stats.totalConnections).toBe(10);
      expect(stats.activeConnections).toBe(5);
      expect(stats.idleConnections).toBe(5);
      expect(stats.waitingClients).toBe(2);
      expect(stats.utilizationRate).toBe(50);
    });
  });

  describe('executeQuery', () => {
    it('should execute query and return results', async () => {
      const mockQueryRunner = {
        query: jest.fn().mockResolvedValue([{ id: 1, name: 'test' }]),
        release: jest.fn().mockResolvedValue(undefined),
      };
      mockConnection.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      const result = await service.executeQuery('SELECT * FROM test');

      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(mockQueryRunner.query).toHaveBeenCalledWith('SELECT * FROM test', undefined);
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('executeTransaction', () => {
    it('should execute transaction successfully', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {},
      };
      mockConnection.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      const operation = jest.fn().mockResolvedValue('success');
      const result = await service.executeTransaction(operation);

      expect(result).toBe('success');
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {},
      };
      mockConnection.createQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);

      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(service.executeTransaction(operation)).rejects.toThrow('Operation failed');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection information', () => {
      const info = service.getConnectionInfo();

      expect(info.name).toBe('test-connection');
      expect(info.type).toBe('postgres');
      expect(info.host).toBe('localhost');
      expect(info.port).toBe(5432);
      expect(info.database).toBe('test_db');
      expect(info.isConnected).toBe(true);
      expect(info.entities).toEqual(['Account', 'Transaction']);
    });
  });

  describe('closeIdleConnections', () => {
    it('should close idle connections', async () => {
      await service.closeIdleConnections();

      expect((mockConnection.driver as any).pool.closeIdle).toHaveBeenCalled();
    });
  });

  describe('getConnectionCount', () => {
    it('should return connection count', () => {
      const count = service.getConnectionCount();
      expect(count).toBe(10);
    });

    it('should return 0 when pool is not available', () => {
      (mockConnection.driver as any).pool = null;

      const count = service.getConnectionCount();
      expect(count).toBe(0);
    });
  });
});