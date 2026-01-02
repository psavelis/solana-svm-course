import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Keypair } from '@solana/web3.js';
import { DexService } from '../dex.service';
import { DexPool, DexType } from '../dex-pool.entity';
import { DexSwap, SwapDirection } from '../dex-swap.entity';
import { DexLiquidityPosition, PositionType } from '../dex-liquidity-position.entity';
import { CpiService } from '../cpi.service';
import { TransactionsService } from '../../transactions/transactions.service';

// Mock Keypair
jest.mock('@solana/web3.js', () => ({
  ...jest.requireActual('@solana/web3.js'),
  Keypair: {
    fromSecretKey: jest.fn().mockReturnValue({
      publicKey: { toString: () => 'user123' },
    }),
  },
}));

describe('DexService', () => {
  let service: DexService;
  let dexPoolRepository: Repository<DexPool>;
  let dexSwapRepository: Repository<DexSwap>;
  let dexLiquidityPositionRepository: Repository<DexLiquidityPosition>;
  let cpiService: CpiService;
  let transactionsService: TransactionsService;

  const mockDexPoolRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockDexSwapRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDexLiquidityPositionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockCpiService = {
    executeCpi: jest.fn(),
  };

  const mockTransactionsService = {
    createTransaction: jest.fn(),
    executeTransaction: jest.fn(),
    sendProgramInvocation: jest.fn().mockResolvedValue('mock-signature'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DexService,
        {
          provide: getRepositoryToken(DexPool),
          useValue: mockDexPoolRepository,
        },
        {
          provide: getRepositoryToken(DexSwap),
          useValue: mockDexSwapRepository,
        },
        {
          provide: getRepositoryToken(DexLiquidityPosition),
          useValue: mockDexLiquidityPositionRepository,
        },
        {
          provide: CpiService,
          useValue: mockCpiService,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    service = module.get<DexService>(DexService);
    dexPoolRepository = module.get<Repository<DexPool>>(getRepositoryToken(DexPool));
    dexSwapRepository = module.get<Repository<DexSwap>>(getRepositoryToken(DexSwap));
    dexLiquidityPositionRepository = module.get<Repository<DexLiquidityPosition>>(
      getRepositoryToken(DexLiquidityPosition),
    );
    cpiService = module.get<CpiService>(CpiService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrUpdatePool', () => {
    it('should create a new DEX pool', async () => {
      const poolData = {
        poolAddress: 'pool123',
        dexType: DexType.AMM,
        dexProgramId: 'program123',
        tokenAMint: 'tokenA123',
        tokenBMint: 'tokenB123',
        tokenABalance: 1000,
        tokenBBalance: 2000,
        feeRate: 0.003,
      };

      const mockPool = { id: '1', ...poolData };
      mockDexPoolRepository.findOne.mockResolvedValue(null);
      mockDexPoolRepository.create.mockReturnValue(mockPool);
      mockDexPoolRepository.save.mockResolvedValue(mockPool);

      const result = await service.createOrUpdatePool(
        poolData.poolAddress,
        poolData.dexType,
        poolData.dexProgramId,
        poolData.tokenAMint,
        poolData.tokenBMint,
        poolData.tokenABalance,
        poolData.tokenBBalance,
        poolData.feeRate,
      );

      expect(result).toEqual(mockPool);
      expect(mockDexPoolRepository.create).toHaveBeenCalledWith({
        ...poolData,
        isActive: true,
      });
    });

    it('should update an existing DEX pool', async () => {
      const existingPool = {
        id: '1',
        poolAddress: 'pool123',
        tokenABalance: 1000,
        tokenBBalance: 2000,
      };

      const updateData = {
        poolAddress: 'pool123',
        dexType: DexType.AMM,
        dexProgramId: 'program123',
        tokenAMint: 'tokenA123',
        tokenBMint: 'tokenB123',
        tokenABalance: 1500,
        tokenBBalance: 2500,
        feeRate: 0.003,
      };

      mockDexPoolRepository.findOne.mockResolvedValue(existingPool);
      mockDexPoolRepository.save.mockResolvedValue({
        ...existingPool,
        ...updateData,
      });

      const result = await service.createOrUpdatePool(
        updateData.poolAddress,
        updateData.dexType,
        updateData.dexProgramId,
        updateData.tokenAMint,
        updateData.tokenBMint,
        updateData.tokenABalance,
        updateData.tokenBBalance,
        updateData.feeRate,
      );

      expect(result.tokenABalance).toBe(1500);
      expect(result.tokenBBalance).toBe(2500);
    });
  });

  describe('getPool', () => {
    it('should return a DEX pool by address', async () => {
      const mockPool = { id: '1', poolAddress: 'pool123' };
      mockDexPoolRepository.findOne.mockResolvedValue(mockPool);

      const result = await service.getPool('pool123');

      expect(result).toEqual(mockPool);
      expect(mockDexPoolRepository.findOne).toHaveBeenCalledWith({
        where: { poolAddress: 'pool123' },
        relations: ['swaps', 'liquidityPositions'],
      });
    });

    it('should throw error when pool not found', async () => {
      mockDexPoolRepository.findOne.mockResolvedValue(null);

      await expect(service.getPool('pool123')).rejects.toThrow('Pool not found');
    });
  });

  describe('getPoolsByTokens', () => {
    it('should return pools by token mints', async () => {
      const mockPools = [{ id: '1', tokenAMint: 'tokenA123', tokenBMint: 'tokenB123' }];

      mockDexPoolRepository.find.mockResolvedValue(mockPools);

      const result = await service.getPoolsByTokens('tokenA123', 'tokenB123');

      expect(result).toEqual(mockPools);
      expect(mockDexPoolRepository.find).toHaveBeenCalledWith({
        where: [
          { tokenAMint: 'tokenA123', tokenBMint: 'tokenB123' },
          { tokenAMint: 'tokenB123', tokenBMint: 'tokenA123' },
        ],
      });
    });
  });

  describe('performSwap', () => {
    it('should perform a DEX swap', async () => {
      const userPrivateKey =
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,143,99,10,122,172,88,196,64,8,232,165,71,127,201,183,58,43,4,96,95,240,166,172,125,31,63,226,38,223]';
      const poolAddress = 'pool123';
      const amountIn = 100;
      const direction = SwapDirection.A_TO_B;

      const mockPool = {
        id: '1',
        poolAddress,
        tokenABalance: 1000,
        tokenBBalance: 2000,
        feeRate: 0.003,
      };

      const mockSwap = {
        id: '1',
        transactionSignature: expect.any(String),
        poolId: '1',
        userAddress: expect.any(String),
        direction,
        amountIn,
        amountOut: expect.any(Number),
        feeAmount: expect.any(Number),
        priceImpact: expect.any(Number),
        slippage: 0.5,
        minimumAmountOut: expect.any(Number),
        status: 'pending',
      };

      mockDexPoolRepository.findOne.mockResolvedValue(mockPool);
      mockDexSwapRepository.create.mockReturnValue(mockSwap);
      mockDexSwapRepository.save.mockResolvedValue(mockSwap);

      const result = await service.performSwap(userPrivateKey, poolAddress, amountIn, direction);

      expect(result).toEqual(mockSwap);
      expect(mockDexSwapRepository.create).toHaveBeenCalled();
      expect(mockDexSwapRepository.save).toHaveBeenCalledWith(mockSwap);
    });

    it('should throw error when pool not found', async () => {
      const userPrivateKey =
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,143,99,10,122,172,88,196,64,8,232,165,71,127,201,183,58,43,4,96,95,240,166,172,125,31,63,226,38,223]';
      mockDexPoolRepository.findOne.mockResolvedValue(null);

      await expect(
        service.performSwap(userPrivateKey, 'pool123', 100, SwapDirection.A_TO_B),
      ).rejects.toThrow('Pool not found');
    });
  });

  describe('addLiquidity', () => {
    it('should add liquidity to a pool', async () => {
      const userPrivateKey =
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,143,99,10,122,172,88,196,64,8,232,165,71,127,201,183,58,43,4,96,95,240,166,172,125,31,63,226,38,223]';
      const poolAddress = 'pool123';
      const tokenAAmount = 100;
      const tokenBAmount = 200;

      const mockPool = {
        id: '1',
        poolAddress,
        tokenABalance: 1000,
        tokenBBalance: 2000,
      };

      const mockPosition = {
        id: '1',
        poolId: '1',
        ownerAddress: expect.any(String),
        positionType: PositionType.STANDARD,
        tokenAAmount,
        tokenBAmount,
        liquidityShares: expect.any(Number),
        isActive: true,
      };

      mockDexPoolRepository.findOne.mockResolvedValue(mockPool);
      mockDexLiquidityPositionRepository.create.mockReturnValue(mockPosition);
      mockDexLiquidityPositionRepository.save.mockResolvedValue(mockPosition);
      mockDexPoolRepository.save.mockResolvedValue({
        ...mockPool,
        tokenABalance: 1100,
        tokenBBalance: 2200,
      });

      const result = await service.addLiquidity(
        userPrivateKey,
        poolAddress,
        tokenAAmount,
        tokenBAmount,
      );

      expect(result).toEqual(mockPosition);
      expect(mockDexLiquidityPositionRepository.create).toHaveBeenCalled();
      expect(mockDexPoolRepository.save).toHaveBeenCalledWith({
        ...mockPool,
        tokenABalance: 1100,
        tokenBBalance: 2200,
      });
    });
  });

  describe('removeLiquidity', () => {
    it('should remove liquidity from a pool', async () => {
      const userPrivateKey =
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,143,99,10,122,172,88,196,64,8,232,165,71,127,201,183,58,43,4,96,95,240,166,172,125,31,63,226,38,223]';
      const positionId = 'position123';
      const percentage = 50;

      const mockPosition = {
        id: positionId,
        poolId: '1',
        ownerAddress: 'user123',
        tokenAAmount: 100,
        tokenBAmount: 200,
        liquidityShares: 10,
        isActive: true,
        pool: {
          id: '1',
          tokenABalance: 1000,
          tokenBBalance: 2000,
        },
      };

      mockDexLiquidityPositionRepository.findOne.mockResolvedValue(mockPosition);
      mockDexLiquidityPositionRepository.save.mockResolvedValue({
        ...mockPosition,
        tokenAAmount: 50,
        tokenBAmount: 100,
        liquidityShares: 5,
      });

      const result = await service.removeLiquidity(userPrivateKey, positionId, percentage);

      expect(result.tokenAAmount).toBe(50);
      expect(result.tokenBAmount).toBe(100);
      expect(result.liquidityShares).toBe(5);
    });

    it('should throw error when position not found', async () => {
      const userPrivateKey =
        '[174,47,154,16,202,193,206,113,199,190,53,133,169,175,31,56,222,53,138,189,224,216,117,173,10,149,53,45,73,46,49,173,32,136,97,143,99,10,122,172,88,196,64,8,232,165,71,127,201,183,58,43,4,96,95,240,166,172,125,31,63,226,38,223]';
      mockDexLiquidityPositionRepository.findOne.mockResolvedValue(null);

      await expect(service.removeLiquidity(userPrivateKey, 'position123')).rejects.toThrow(
        'Position not found',
      );
    });
  });

  describe('getUserPositions', () => {
    it('should return user liquidity positions', async () => {
      const userAddress = 'user123';
      const mockPositions = [{ id: '1', ownerAddress: userAddress, isActive: true }];

      mockDexLiquidityPositionRepository.find.mockResolvedValue(mockPositions);

      const result = await service.getUserPositions(userAddress);

      expect(result).toEqual(mockPositions);
      expect(mockDexLiquidityPositionRepository.find).toHaveBeenCalledWith({
        where: { ownerAddress: userAddress, isActive: true },
        relations: ['pool'],
      });
    });
  });

  describe('calculateSwapAmount', () => {
    it('should calculate swap amount for A to B', () => {
      const pool = {
        tokenABalance: 1000,
        tokenBBalance: 2000,
        feeRate: 0.003,
      };

      const result = service.calculateSwapAmount(pool as any, 100, SwapDirection.A_TO_B, 0.5);

      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.feeAmount).toBe(0.3);
      expect(typeof result.priceImpact).toBe('number');
      expect(result.minimumAmountOut).toBe(result.amountOut * 0.995);
    });

    it('should calculate swap amount for B to A', () => {
      const pool = {
        tokenABalance: 1000,
        tokenBBalance: 2000,
        feeRate: 0.003,
      };

      const result = service.calculateSwapAmount(pool as any, 100, SwapDirection.B_TO_A, 0.5);

      expect(result.amountOut).toBeGreaterThan(0);
      expect(result.feeAmount).toBe(0.3);
      expect(typeof result.priceImpact).toBe('number');
      expect(result.minimumAmountOut).toBe(result.amountOut * 0.995);
    });
  });

  describe('getUserSwapHistory', () => {
    it('should return user swap history', async () => {
      const userAddress = 'user123';
      const mockSwaps = [{ id: '1', userAddress }];

      mockDexSwapRepository.find.mockResolvedValue(mockSwaps);

      const result = await service.getUserSwapHistory(userAddress);

      expect(result).toEqual(mockSwaps);
      expect(mockDexSwapRepository.find).toHaveBeenCalledWith({
        where: { userAddress },
        relations: ['pool'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      const poolAddress = 'pool123';
      const mockPool = {
        id: '1',
        poolAddress,
        tokenABalance: 1000,
        tokenBBalance: 2000,
        feeRate: 0.003,
      };

      const mockSwaps = [
        { amountIn: 100, amountOut: 95, feeAmount: 0.3, createdAt: new Date() },
        { amountIn: 200, amountOut: 190, feeAmount: 0.6, createdAt: new Date() },
      ];

      mockDexPoolRepository.findOne.mockResolvedValue(mockPool);
      mockDexSwapRepository.find.mockResolvedValue(mockSwaps);

      const result = await service.getPoolStats(poolAddress);

      expect(result.poolAddress).toBe('pool123');
      expect(result.liquidity).toBe(3000); // 1000+2000
      expect(result.volume24h).toBe(300); // 100+200
      expect(result.swapCount).toBe(2);
      expect(result.feeRate).toBe(0.003);
    });
  });
});
