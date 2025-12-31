import { Test, TestingModule } from '@nestjs/testing';
import { NetworkController } from './network.controller';
import { NetworkService, SolanaNetwork } from './network.service';

describe('NetworkController', () => {
  let controller: NetworkController;
  let service: NetworkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NetworkController],
      providers: [NetworkService],
    }).compile();

    controller = module.get<NetworkController>(NetworkController);
    service = module.get<NetworkService>(NetworkService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentNetwork', () => {
    it('should return current network info', () => {
      const result = controller.getCurrentNetwork();
      expect(result).toBeDefined();
      expect(result.network).toBe(SolanaNetwork.DEVNET);
      expect(result.config).toBeDefined();
    });
  });

  describe('switchNetwork', () => {
    it('should switch to MAINNET', () => {
      const result = controller.switchNetwork({ network: SolanaNetwork.MAINNET });
      expect(result).toBeDefined();
      expect(result.message).toContain('Switched to mainnet-beta');
      expect(result.network).toBe(SolanaNetwork.MAINNET);
    });

    it('should switch to TESTNET', () => {
      const result = controller.switchNetwork({ network: SolanaNetwork.TESTNET });
      expect(result).toBeDefined();
      expect(result.message).toContain('Switched to testnet');
      expect(result.network).toBe(SolanaNetwork.TESTNET);
    });
  });

  describe('getAvailableNetworks', () => {
    it('should return all available networks', () => {
      const result = controller.getAvailableNetworks();
      expect(result).toBeDefined();
      expect(result.networks).toHaveLength(3);
      expect(result.networks).toContain(SolanaNetwork.MAINNET);
      expect(result.networks).toContain(SolanaNetwork.DEVNET);
      expect(result.networks).toContain(SolanaNetwork.TESTNET);
    });
  });

  describe('getNetworkHealth', () => {
    it('should return current network health', async () => {
      const result = await controller.getNetworkHealth();
      expect(result).toBeDefined();
      expect(result.network).toBe(SolanaNetwork.DEVNET);
      expect(typeof result.isHealthy).toBe('boolean');
    });
  });

  describe('getSpecificNetworkHealth', () => {
    it('should return specific network health', async () => {
      const result = await controller.getSpecificNetworkHealth(SolanaNetwork.MAINNET);
      expect(result).toBeDefined();
      expect(result.network).toBe(SolanaNetwork.MAINNET);
      expect(typeof result.isHealthy).toBe('boolean');
    });
  });

  describe('getAllNetworkHealth', () => {
    it('should return all networks health', async () => {
      const result = await controller.getAllNetworkHealth();
      expect(result).toHaveLength(3);
      result.forEach(health => {
        expect(Object.values(SolanaNetwork)).toContain(health.network);
        expect(typeof health.isHealthy).toBe('boolean');
      });
    });
  });

  describe('getNetworkConfig', () => {
    it('should return network config', () => {
      const result = controller.getNetworkConfig(SolanaNetwork.MAINNET);
      expect(result).toBeDefined();
      expect(result.name).toBe(SolanaNetwork.MAINNET);
      expect(result.rpcUrl).toContain('mainnet');
    });
  });
});