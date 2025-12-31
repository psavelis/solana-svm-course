import { Test, TestingModule } from '@nestjs/testing';
import { NetworkService, SolanaNetwork } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NetworkService],
    }).compile();

    service = module.get<NetworkService>(NetworkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentNetwork', () => {
    it('should return the default network (DEVNET)', () => {
      expect(service.getCurrentNetwork()).toBe(SolanaNetwork.DEVNET);
    });
  });

  describe('setCurrentNetwork', () => {
    it('should set the current network to MAINNET', () => {
      service.setCurrentNetwork(SolanaNetwork.MAINNET);
      expect(service.getCurrentNetwork()).toBe(SolanaNetwork.MAINNET);
    });

    it('should set the current network to TESTNET', () => {
      service.setCurrentNetwork(SolanaNetwork.TESTNET);
      expect(service.getCurrentNetwork()).toBe(SolanaNetwork.TESTNET);
    });

    it('should throw error for unsupported network', () => {
      expect(() => {
        service.setCurrentNetwork('unsupported' as SolanaNetwork);
      }).toThrow('Unsupported network: unsupported');
    });
  });

  describe('getConnection', () => {
    it('should return a connection for the current network', () => {
      const connection = service.getConnection();
      expect(connection).toBeDefined();
    });

    it('should return a connection for a specific network', () => {
      const connection = service.getConnection(SolanaNetwork.MAINNET);
      expect(connection).toBeDefined();
    });

    it('should throw error for invalid network', () => {
      expect(() => {
        service.getConnection('invalid' as SolanaNetwork);
      }).toThrow('No connection available for network: invalid');
    });
  });

  describe('getNetworkConfig', () => {
    it('should return config for current network', () => {
      const config = service.getNetworkConfig();
      expect(config).toBeDefined();
      expect(config.name).toBe(SolanaNetwork.DEVNET);
      expect(config.rpcUrl).toContain('devnet');
    });

    it('should return config for specific network', () => {
      const config = service.getNetworkConfig(SolanaNetwork.MAINNET);
      expect(config).toBeDefined();
      expect(config.name).toBe(SolanaNetwork.MAINNET);
      expect(config.rpcUrl).toContain('mainnet');
    });

    it('should throw error for invalid network', () => {
      expect(() => {
        service.getNetworkConfig('invalid' as SolanaNetwork);
      }).toThrow('No configuration available for network: invalid');
    });
  });

  describe('getAllNetworks', () => {
    it('should return all available networks', () => {
      const networks = service.getAllNetworks();
      expect(networks).toContain(SolanaNetwork.MAINNET);
      expect(networks).toContain(SolanaNetwork.DEVNET);
      expect(networks).toContain(SolanaNetwork.TESTNET);
      expect(networks).toHaveLength(3);
    });
  });

  describe('getNetworkHealth', () => {
    it('should return health status for current network', async () => {
      const health = await service.getNetworkHealth();
      expect(health).toBeDefined();
      expect(health.network).toBe(SolanaNetwork.DEVNET);
      expect(typeof health.isHealthy).toBe('boolean');
    });

    it('should return health status for specific network', async () => {
      const health = await service.getNetworkHealth(SolanaNetwork.MAINNET);
      expect(health).toBeDefined();
      expect(health.network).toBe(SolanaNetwork.MAINNET);
      expect(typeof health.isHealthy).toBe('boolean');
    });
  });

  describe('getAllNetworkHealth', () => {
    it('should return health status for all networks', async () => {
      const healthStatuses = await service.getAllNetworkHealth();
      expect(healthStatuses).toHaveLength(3);
      healthStatuses.forEach(health => {
        expect(Object.values(SolanaNetwork)).toContain(health.network);
        expect(typeof health.isHealthy).toBe('boolean');
      });
    });
  });
});