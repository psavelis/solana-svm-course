import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PlayerWalletService } from '../services/player-wallet.service';
import {
  PlayerWallet,
  PlayerWalletStatus,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
} from '../entities/player-wallet.entity';
import { MpcService } from '../../mpc/mpc.service';
import { ThresholdScheme } from '../../mpc/mpc-wallet.entity';

describe('PlayerWalletService', () => {
  let service: PlayerWalletService;
  let walletRepository: jest.Mocked<Repository<PlayerWallet>>;
  let txRepository: jest.Mocked<Repository<WalletTransaction>>;
  let mpcService: jest.Mocked<MpcService>;

  const mockWalletRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTxRepository = {
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMpcService = {
    createMpcWallet: jest.fn(),
    signTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerWalletService,
        {
          provide: getRepositoryToken(PlayerWallet),
          useValue: mockWalletRepository,
        },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: mockTxRepository,
        },
        {
          provide: MpcService,
          useValue: mockMpcService,
        },
      ],
    }).compile();

    service = module.get<PlayerWalletService>(PlayerWalletService);
    walletRepository = module.get(getRepositoryToken(PlayerWallet));
    txRepository = module.get(getRepositoryToken(WalletTransaction));
    mpcService = module.get(MpcService) as jest.Mocked<MpcService>;

    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create MPC-secured wallet', async () => {
      const playerId = 'player_123';

      mockWalletRepository.findOne.mockResolvedValue(null);
      mockMpcService.createMpcWallet.mockResolvedValue({
        walletId: 'mpc_wallet_123',
        publicKey: 'pk_123abc',
        thresholdScheme: ThresholdScheme.TSS_2_3,
        totalShares: 3,
        threshold: 2,
        canSign: true,
        activeShares: 3,
      } as any);
      mockWalletRepository.create.mockReturnValue({
        playerId,
        mpcWalletId: 'mpc_wallet_123',
        publicKey: 'pk_123abc',
        status: PlayerWalletStatus.ACTIVE,
      } as PlayerWallet);
      mockWalletRepository.save.mockResolvedValue({
        id: '1',
        playerId,
        mpcWalletId: 'mpc_wallet_123',
        publicKey: 'pk_123abc',
        status: PlayerWalletStatus.ACTIVE,
        availableBalance: '0',
        lockedBalance: '0',
      } as PlayerWallet);

      const result = await service.createWallet({ playerId });

      expect(result.playerId).toBe(playerId);
      expect(result.status).toBe(PlayerWalletStatus.ACTIVE);
      expect(mockMpcService.createMpcWallet).toHaveBeenCalledWith(
        expect.objectContaining({
          thresholdScheme: ThresholdScheme.TSS_2_3,
          participants: expect.arrayContaining([
            expect.objectContaining({ participantId: `player_${playerId}` }),
            expect.objectContaining({ participantId: 'platform_signer' }),
            expect.objectContaining({ participantId: 'recovery_service' }),
          ]),
        }),
      );
    });

    it('should throw if wallet already exists', async () => {
      mockWalletRepository.findOne.mockResolvedValue({
        id: '1',
        playerId: 'player_123',
      } as PlayerWallet);

      await expect(service.createWallet({ playerId: 'player_123' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getBalance', () => {
    it('should return wallet balance', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '5000000000',
        lockedBalance: '1000000000',
        getTotalBalance: jest.fn().mockReturnValue(BigInt(6000000000)),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);

      const result = await service.getBalance('player_123');

      expect(result.availableBalance).toBe('5000000000');
      expect(result.lockedBalance).toBe('1000000000');
      expect(result.totalBalance).toBe('6000000000');
    });

    it('should throw if wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(service.getBalance('invalid_player')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deposit', () => {
    it('should record deposit and update balance', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        publicKey: 'pk_123',
        availableBalance: '0',
        totalDeposited: '0',
        isActive: jest.fn().mockReturnValue(true),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);
      mockTxRepository.create.mockReturnValue({
        type: WalletTransactionType.DEPOSIT,
        amount: '5000000000',
        status: WalletTransactionStatus.COMPLETED,
      } as WalletTransaction);
      mockTxRepository.save.mockResolvedValue({
        id: '1',
        type: WalletTransactionType.DEPOSIT,
        amount: '5000000000',
        status: WalletTransactionStatus.COMPLETED,
      } as WalletTransaction);
      mockWalletRepository.save.mockResolvedValue(wallet);

      const result = await service.deposit({
        playerId: 'player_123',
        amount: '5000000000',
        signature: 'tx_sig_123',
      });

      expect(result.type).toBe(WalletTransactionType.DEPOSIT);
      expect(result.amount).toBe('5000000000');
      expect(result.status).toBe(WalletTransactionStatus.COMPLETED);
    });

    it('should reject deposit for inactive wallet', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        status: PlayerWalletStatus.SUSPENDED,
        isActive: jest.fn().mockReturnValue(false),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);

      await expect(
        service.deposit({
          playerId: 'player_123',
          amount: '5000000000',
          signature: 'tx_sig',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('withdraw', () => {
    it('should process MPC-signed withdrawal', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        publicKey: 'pk_123',
        mpcWalletId: 'mpc_123',
        availableBalance: '10000000000',
        totalWithdrawn: '0',
        dailyWithdrawalAmount: '0',
        dailyWithdrawalResetAt: new Date(Date.now() + 86400000),
        lastWithdrawalAt: null,
        isActive: jest.fn().mockReturnValue(true),
        canWithdraw: jest.fn().mockReturnValue(true),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);
      mockTxRepository.create.mockReturnValue({
        type: WalletTransactionType.WITHDRAWAL,
        status: WalletTransactionStatus.PROCESSING,
      } as WalletTransaction);
      mockTxRepository.save.mockResolvedValue({
        id: '1',
        type: WalletTransactionType.WITHDRAWAL,
        amount: '2000000000',
        status: WalletTransactionStatus.COMPLETED,
        signature: 'mpc_sig_123',
      } as WalletTransaction);
      mockMpcService.signTransaction.mockResolvedValue({
        completeSignature: 'mpc_sig_123',
        reconstructed: true,
        participantsUsed: 2,
      } as any);
      mockWalletRepository.save.mockResolvedValue(wallet);

      const result = await service.withdraw({
        playerId: 'player_123',
        amount: '2000000000',
        destinationAddress: 'dest_address_123',
      });

      expect(result.type).toBe(WalletTransactionType.WITHDRAWAL);
      expect(result.signature).toBe('mpc_sig_123');
      expect(mockMpcService.signTransaction).toHaveBeenCalled();
    });

    it('should reject withdrawal exceeding balance', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '1000000000',
        isActive: jest.fn().mockReturnValue(true),
        canWithdraw: jest.fn().mockReturnValue(false),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);

      await expect(
        service.withdraw({
          playerId: 'player_123',
          amount: '5000000000',
          destinationAddress: 'dest_123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockFunds', () => {
    it('should lock funds for match entry', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '5000000000',
        lockedBalance: '0',
        totalEntryFees: '0',
        canLock: jest.fn().mockReturnValue(true),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);
      mockTxRepository.create.mockReturnValue({
        type: WalletTransactionType.ENTRY_FEE,
        amount: '1000000000',
      } as WalletTransaction);
      mockTxRepository.save.mockResolvedValue({
        id: '1',
        type: WalletTransactionType.ENTRY_FEE,
        amount: '1000000000',
        status: WalletTransactionStatus.COMPLETED,
      } as WalletTransaction);
      mockWalletRepository.save.mockResolvedValue(wallet);

      const result = await service.lockFunds({
        playerId: 'player_123',
        amount: '1000000000',
        reference: 'match_123',
      });

      expect(result.type).toBe(WalletTransactionType.ENTRY_FEE);
    });

    it('should reject lock if insufficient balance', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '500000000',
        canLock: jest.fn().mockReturnValue(false),
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);

      await expect(
        service.lockFunds({
          playerId: 'player_123',
          amount: '1000000000',
          reference: 'match_123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('unlockFunds', () => {
    it('should unlock funds on refund', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '0',
        lockedBalance: '1000000000',
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);
      mockTxRepository.create.mockReturnValue({
        type: WalletTransactionType.REFUND,
        amount: '1000000000',
      } as WalletTransaction);
      mockTxRepository.save.mockResolvedValue({
        id: '1',
        type: WalletTransactionType.REFUND,
        amount: '1000000000',
        status: WalletTransactionStatus.COMPLETED,
      } as WalletTransaction);
      mockWalletRepository.save.mockResolvedValue(wallet);

      const result = await service.unlockFunds({
        playerId: 'player_123',
        amount: '1000000000',
        reference: 'match_123',
      });

      expect(result.type).toBe(WalletTransactionType.REFUND);
    });
  });

  describe('creditPrize', () => {
    it('should credit prize winnings', async () => {
      const wallet = {
        id: '1',
        playerId: 'player_123',
        availableBalance: '0',
        totalWinnings: '0',
      } as unknown as PlayerWallet;

      mockWalletRepository.findOne.mockResolvedValue(wallet);
      mockTxRepository.create.mockReturnValue({
        type: WalletTransactionType.PRIZE_WIN,
        amount: '1900000000',
      } as WalletTransaction);
      mockTxRepository.save.mockResolvedValue({
        id: '1',
        type: WalletTransactionType.PRIZE_WIN,
        amount: '1900000000',
        status: WalletTransactionStatus.COMPLETED,
      } as WalletTransaction);
      mockWalletRepository.save.mockResolvedValue(wallet);

      const result = await service.creditPrize('player_123', '1900000000', 'match_123');

      expect(result.type).toBe(WalletTransactionType.PRIZE_WIN);
      expect(result.amount).toBe('1900000000');
    });
  });
});
