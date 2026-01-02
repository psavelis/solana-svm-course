import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseConnectionController } from '../database-connection.controller';
import { DatabaseConnectionService } from '../database-connection.service';

describe('DatabaseConnectionController', () => {
  let controller: DatabaseConnectionController;
  let mockService: Partial<DatabaseConnectionService>;

  beforeEach(async () => {
    mockService = {
      getHealthStatus: jest.fn().mockResolvedValue({
        status: 'healthy',
        connectionCount: 10,
        activeConnections: 5,
        idleConnections: 5,
        waitingClients: 2,
        totalCount: 10,
        idleCount: 5,
        waitingCount: 2,
        lastChecked: new Date(),
        uptime: 3600000,
        poolConfig: {
          min: 2,
          max: 20,
          idleTimeoutMillis: 30000,
          acquireTimeoutMillis: 60000,
        },
      }),
      getPoolStats: jest.fn().mockResolvedValue({
        totalConnections: 10,
        activeConnections: 5,
        idleConnections: 5,
        waitingClients: 2,
        utilizationRate: 50,
        poolConfig: {
          min: 2,
          max: 20,
          idleTimeoutMillis: 30000,
          acquireTimeoutMillis: 60000,
        },
      }),
      getConnectionInfo: jest.fn().mockReturnValue({
        name: 'test-connection',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        isConnected: true,
        entities: ['Account', 'Transaction'],
      }),
      performHealthCheck: jest.fn().mockResolvedValue(true),
      closeIdleConnections: jest.fn().mockResolvedValue(undefined),
      getConnectionCount: jest.fn().mockReturnValue(10),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabaseConnectionController],
      providers: [
        {
          provide: DatabaseConnectionService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DatabaseConnectionController>(DatabaseConnectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.connectionCount).toBe(10);
      expect(mockService.getHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      const result = await controller.getPoolStats();

      expect(result.totalConnections).toBe(10);
      expect(result.utilizationRate).toBe(50);
      expect(mockService.getPoolStats).toHaveBeenCalled();
    });
  });

  describe('getConnectionInfo', () => {
    it('should return connection information', () => {
      const result = controller.getConnectionInfo();

      expect(result.name).toBe('test-connection');
      expect(result.type).toBe('postgres');
      expect(mockService.getConnectionInfo).toHaveBeenCalled();
    });
  });

  describe('performHealthCheck', () => {
    it('should perform health check and return result', async () => {
      const result = await controller.performHealthCheck();

      expect(result.healthy).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(mockService.performHealthCheck).toHaveBeenCalled();
    });
  });

  describe('closeIdleConnections', () => {
    it('should close idle connections', async () => {
      const result = await controller.closeIdleConnections();

      expect(result.message).toBe('Idle connections closed');
      expect(result.timestamp).toBeDefined();
      expect(mockService.closeIdleConnections).toHaveBeenCalled();
    });
  });

  describe('getConnectionCount', () => {
    it('should return connection count', () => {
      const result = controller.getConnectionCount();

      expect(result.connectionCount).toBe(10);
      expect(result.timestamp).toBeDefined();
      expect(mockService.getConnectionCount).toHaveBeenCalled();
    });
  });
});
