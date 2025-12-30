import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MpcService } from '../mpc.service';
import { MpcWallet, MpcWalletStatus, ThresholdScheme } from '../mpc-wallet.entity';
import { KeyShare, KeyShareStatus, KeyShareType } from '../key-share.entity';

describe('MpcService', () => {
  let service: MpcService;
  let mpcWalletRepository: Repository<MpcWallet>;
  let keyShareRepository: Repository<KeyShare>;

  const mockMpcWalletRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockKeyShareRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MpcService,
        {
          provide: getRepositoryToken(MpcWallet),
          useValue: mockMpcWalletRepository,
        },
        {
          provide: getRepositoryToken(KeyShare),
          useValue: mockKeyShareRepository,
        },
      ],
    }).compile();

    service = module.get<MpcService>(MpcService);
    mpcWalletRepository = module.get<Repository<MpcWallet>>(getRepositoryToken(MpcWallet));
    keyShareRepository = module.get<Repository<KeyShare>>(getRepositoryToken(KeyShare));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMpcWallet', () => {
    const createWalletRequest = {
      name: 'Test MPC Wallet',
      thresholdScheme: ThresholdScheme.TSS_2_3,
      participants: [
        { participantId: 'alice', participantPublicKey: 'alice-pubkey' },
        { participantId: 'bob', participantPublicKey: 'bob-pubkey' },
        { participantId: 'charlie', participantPublicKey: 'charlie-pubkey' },
      ],
      metadata: { description: 'Test wallet' },
    };

    it('should create a new MPC wallet successfully', async () => {
      const mockWallet = {
        id: 'wallet-id',
        walletId: 'mpc_test123',
        name: createWalletRequest.name,
        thresholdScheme: createWalletRequest.thresholdScheme,
        totalShares: 3,
        threshold: 2,
        publicKey: 'mock-public-key',
        status: MpcWalletStatus.ACTIVE,
        keyShares: [],
        isActive: () => true,
        getActiveSharesCount: () => 3,
        canSign: () => true,
        createdAt: new Date(),
      };

      mockMpcWalletRepository.create.mockReturnValue(mockWallet);
      mockMpcWalletRepository.save.mockResolvedValue(mockWallet);
      mockKeyShareRepository.create.mockReturnValue({});
      mockKeyShareRepository.save.mockResolvedValue([]);

      // Mock the findOne call that loads wallet with shares
      mockMpcWalletRepository.findOne.mockResolvedValue({
        ...mockWallet,
        keyShares: [],
        isActive: () => true,
        getActiveSharesCount: () => 3,
        canSign: () => true,
        createdAt: new Date(),
      });

      const result = await service.createMpcWallet(createWalletRequest);

      expect(result).toBeDefined();
      expect(result.name).toBe(createWalletRequest.name);
      expect(result.threshold).toBe(2);
      expect(result.totalShares).toBe(3);
      expect(result.status).toBe(MpcWalletStatus.ACTIVE);
      expect(mockMpcWalletRepository.create).toHaveBeenCalled();
      expect(mockMpcWalletRepository.save).toHaveBeenCalled();
    });

    it('should throw error for insufficient participants', async () => {
      const invalidRequest = {
        ...createWalletRequest,
        participants: [{ participantId: 'alice', participantPublicKey: 'alice-pubkey' }],
      };

      await expect(service.createMpcWallet(invalidRequest)).rejects.toThrow(
        'MPC wallet requires at least 2 participants'
      );
    });

    it('should throw error for mismatched participant count', async () => {
      const invalidRequest = {
        ...createWalletRequest,
        thresholdScheme: ThresholdScheme.TSS_2_3,
        participants: [
          { participantId: 'alice', participantPublicKey: 'alice-pubkey' },
          { participantId: 'bob', participantPublicKey: 'bob-pubkey' },
        ], // Only 2 participants for 2-of-3 scheme
      };

      await expect(service.createMpcWallet(invalidRequest)).rejects.toThrow(
        'Threshold scheme 2-of-3 requires exactly 3 participants'
      );
    });
  });

  describe('getMpcWallets', () => {
    it('should return all MPC wallets', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          walletId: 'mpc_123',
          name: 'Wallet 1',
          thresholdScheme: ThresholdScheme.TSS_2_3,
          totalShares: 3,
          threshold: 2,
          publicKey: 'pubkey1',
          status: MpcWalletStatus.ACTIVE,
          keyShares: [],
          getActiveSharesCount: () => 3,
          canSign: () => true,
          createdAt: new Date(),
        },
      ];

      mockMpcWalletRepository.find.mockResolvedValue(mockWallets);

      const result = await service.getMpcWallets();

      expect(result).toHaveLength(1);
      expect(result[0].walletId).toBe('mpc_123');
      expect(mockMpcWalletRepository.find).toHaveBeenCalledWith({
        relations: ['keyShares'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getMpcWallet', () => {
    it('should return a specific wallet', async () => {
      const mockWallet = {
        id: 'wallet-1',
        walletId: 'mpc_123',
        name: 'Wallet 1',
        thresholdScheme: ThresholdScheme.TSS_2_3,
        totalShares: 3,
        threshold: 2,
        publicKey: 'pubkey1',
        status: MpcWalletStatus.ACTIVE,
        keyShares: [],
        getActiveSharesCount: () => 3,
        canSign: () => true,
        createdAt: new Date(),
      };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.getMpcWallet('mpc_123');

      expect(result.walletId).toBe('mpc_123');
      expect(mockMpcWalletRepository.findOne).toHaveBeenCalledWith({
        where: { walletId: 'mpc_123' },
        relations: ['keyShares'],
      });
    });

    it('should throw error for non-existent wallet', async () => {
      mockMpcWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.getMpcWallet('non-existent')).rejects.toThrow(
        'MPC wallet non-existent not found'
      );
    });
  });

  describe('signTransaction', () => {
    const signRequest = {
      walletId: 'mpc_123',
      transactionData: 'base64-transaction-data',
      participantShares: [
        { participantId: 'alice', signatureShare: 'alice-signature-share' },
        { participantId: 'bob', signatureShare: 'bob-signature-share' },
      ],
    };

    it('should sign transaction successfully', async () => {
      const mockWallet = {
        id: 'wallet-1',
        walletId: 'mpc_123',
        status: MpcWalletStatus.ACTIVE,
        threshold: 2,
        isActive: () => true,
        keyShares: [
          {
            participantId: 'alice',
            shareIndex: 0,
            status: KeyShareStatus.ACTIVE,
            isActive: () => true,
            markAsUsed: jest.fn(),
          },
          {
            participantId: 'bob',
            shareIndex: 1,
            status: KeyShareStatus.ACTIVE,
            isActive: () => true,
            markAsUsed: jest.fn(),
          },
        ],
      };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await service.signTransaction(signRequest);

      expect(result).toBeDefined();
      expect(result.reconstructed).toBe(true);
      expect(result.participantsUsed).toBe(2);
      expect(result.completeSignature).toBeDefined();
    });

    it('should throw error for insufficient shares', async () => {
      const mockWallet = {
        id: 'wallet-1',
        walletId: 'mpc_123',
        status: MpcWalletStatus.ACTIVE,
        threshold: 3, // Requires 3 shares
        isActive: () => true,
        keyShares: [],
      };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(service.signTransaction(signRequest)).rejects.toThrow(
        'Insufficient shares: got 2, need 3'
      );
    });

    it('should throw error for inactive wallet', async () => {
      const mockWallet = {
        id: 'wallet-1',
        walletId: 'mpc_123',
        status: MpcWalletStatus.DISABLED,
        threshold: 2,
        isActive: () => false,
        keyShares: [],
      };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);

      await expect(service.signTransaction(signRequest)).rejects.toThrow(
        'MPC wallet mpc_123 is not active'
      );
    });
  });

  describe('revokeKeyShare', () => {
    it('should revoke a key share successfully', async () => {
      const mockWallet = {
        id: 'wallet-1',
        walletId: 'mpc_123',
        getActiveSharesCount: () => 3,
        threshold: 2,
      };
      const mockShare = {
        id: 'share-1',
        status: KeyShareStatus.ACTIVE,
        participantId: 'alice',
        shareIndex: 0,
      };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockKeyShareRepository.findOne.mockResolvedValue(mockShare);
      mockKeyShareRepository.save.mockResolvedValue({ ...mockShare, status: KeyShareStatus.REVOKED });

      await service.revokeKeyShare('mpc_123', 'alice', 0);

      expect(mockKeyShareRepository.save).toHaveBeenCalledWith({
        ...mockShare,
        status: KeyShareStatus.REVOKED,
      });
    });

    it('should throw error for non-existent share', async () => {
      const mockWallet = { id: 'wallet-1', walletId: 'mpc_123' };

      mockMpcWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockKeyShareRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeKeyShare('mpc_123', 'alice', 0)).rejects.toThrow(
        'Key share not found for participant alice'
      );
    });
  });
});