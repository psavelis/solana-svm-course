import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { EscrowService } from '../services/escrow.service';
import {
  EscrowAccount,
  EscrowStatus,
  EscrowSourceType,
  EscrowTransaction,
  EscrowTransactionType,
} from '../entities/escrow.entity';

describe('EscrowService', () => {
  let service: EscrowService;
  let escrowRepository: jest.Mocked<Repository<EscrowAccount>>;
  let escrowTxRepository: jest.Mocked<Repository<EscrowTransaction>>;

  const mockEscrowRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockEscrowTxRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EscrowService,
        {
          provide: getRepositoryToken(EscrowAccount),
          useValue: mockEscrowRepository,
        },
        {
          provide: getRepositoryToken(EscrowTransaction),
          useValue: mockEscrowTxRepository,
        },
      ],
    }).compile();

    service = module.get<EscrowService>(EscrowService);
    escrowRepository = module.get(getRepositoryToken(EscrowAccount));
    escrowTxRepository = module.get(getRepositoryToken(EscrowTransaction));

    jest.clearAllMocks();
  });

  describe('createEscrow', () => {
    it('should create escrow account for a match', async () => {
      const request = {
        sourceType: EscrowSourceType.MATCH,
        sourceId: 'match_123',
        platformFeePercent: 5.0,
      };

      mockEscrowRepository.findOne.mockResolvedValue(null);
      mockEscrowRepository.create.mockReturnValue({
        ...request,
        escrowId: 'escrow_test',
        status: EscrowStatus.CREATED,
      } as EscrowAccount);
      mockEscrowRepository.save.mockResolvedValue({
        ...request,
        id: '1',
        escrowId: 'escrow_test',
        escrowAddress: 'test_address',
        status: EscrowStatus.CREATED,
      } as EscrowAccount);

      const result = await service.createEscrow(request);

      expect(result.sourceType).toBe(EscrowSourceType.MATCH);
      expect(result.sourceId).toBe('match_123');
      expect(result.status).toBe(EscrowStatus.CREATED);
      expect(mockEscrowRepository.create).toHaveBeenCalled();
      expect(mockEscrowRepository.save).toHaveBeenCalled();
    });

    it('should throw if escrow already exists', async () => {
      mockEscrowRepository.findOne.mockResolvedValue({
        id: '1',
        escrowId: 'existing_escrow',
      } as EscrowAccount);

      await expect(
        service.createEscrow({
          sourceType: EscrowSourceType.MATCH,
          sourceId: 'match_123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('depositToEscrow', () => {
    it('should deposit funds to escrow', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        escrowAddress: 'address_123',
        status: EscrowStatus.CREATED,
        totalDeposited: '0',
        currentBalance: '0',
        canDeposit: jest.fn().mockReturnValue(true),
      } as unknown as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);
      mockEscrowTxRepository.create.mockReturnValue({
        type: EscrowTransactionType.DEPOSIT,
        amount: '1000000000',
      } as EscrowTransaction);
      mockEscrowTxRepository.save.mockResolvedValue({
        id: '1',
        type: EscrowTransactionType.DEPOSIT,
        amount: '1000000000',
      } as EscrowTransaction);
      mockEscrowRepository.save.mockResolvedValue(escrow);

      const result = await service.depositToEscrow({
        escrowId: 'escrow_123',
        walletId: 'wallet_123',
        amount: '1000000000',
        signature: 'sig_123',
      });

      expect(result.type).toBe(EscrowTransactionType.DEPOSIT);
      expect(result.amount).toBe('1000000000');
    });

    it('should reject deposit when escrow is locked', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.LOCKED,
        canDeposit: jest.fn().mockReturnValue(false),
      } as unknown as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);

      await expect(
        service.depositToEscrow({
          escrowId: 'escrow_123',
          walletId: 'wallet_123',
          amount: '1000000000',
          signature: 'sig_123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('lockEscrow', () => {
    it('should lock active escrow', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.ACTIVE,
      } as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);
      mockEscrowRepository.save.mockResolvedValue({
        ...escrow,
        status: EscrowStatus.LOCKED,
      });

      const result = await service.lockEscrow('escrow_123');

      expect(result.status).toBe(EscrowStatus.LOCKED);
    });

    it('should reject locking non-active escrow', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.RELEASED,
      } as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);

      await expect(service.lockEscrow('escrow_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseEscrow', () => {
    it('should release funds to winners', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.LOCKED,
        currentBalance: '2000000000',
        totalReleased: '0',
        platformFeeCollected: '0',
        platformFeePercent: 5,
        canRelease: jest.fn().mockReturnValue(true),
        transactions: [],
      } as unknown as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);
      mockEscrowTxRepository.create.mockReturnValue({
        type: EscrowTransactionType.RELEASE,
      } as EscrowTransaction);
      mockEscrowTxRepository.save.mockResolvedValue({
        id: '1',
        type: EscrowTransactionType.RELEASE,
      } as EscrowTransaction);
      mockEscrowRepository.save.mockResolvedValue(escrow);

      const result = await service.releaseEscrow({
        escrowId: 'escrow_123',
        distributions: [{ walletId: 'wallet_1', amount: '1900000000', placement: 1 }],
      });

      expect(result.length).toBeGreaterThan(0);
      expect(mockEscrowRepository.save).toHaveBeenCalled();
    });

    it('should reject release when balance insufficient', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.LOCKED,
        currentBalance: '1000000000',
        platformFeePercent: 5,
        canRelease: jest.fn().mockReturnValue(true),
        transactions: [],
      } as unknown as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);

      await expect(
        service.releaseEscrow({
          escrowId: 'escrow_123',
          distributions: [{ walletId: 'wallet_1', amount: '2000000000', placement: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundEscrow', () => {
    it('should refund all deposits', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        status: EscrowStatus.ACTIVE,
        currentBalance: '2000000000',
        totalRefunded: '0',
        canRefund: jest.fn().mockReturnValue(true),
        transactions: [],
      } as unknown as EscrowAccount;

      const deposits = [
        {
          id: '1',
          type: EscrowTransactionType.DEPOSIT,
          participantWalletId: 'wallet_1',
          amount: '1000000000',
        },
        {
          id: '2',
          type: EscrowTransactionType.DEPOSIT,
          participantWalletId: 'wallet_2',
          amount: '1000000000',
        },
      ];

      mockEscrowRepository.findOne.mockResolvedValue(escrow);
      mockEscrowTxRepository.find.mockResolvedValue(deposits);
      mockEscrowTxRepository.create.mockReturnValue({
        type: EscrowTransactionType.REFUND,
      } as EscrowTransaction);
      mockEscrowTxRepository.save.mockResolvedValue({
        id: '1',
        type: EscrowTransactionType.REFUND,
      } as EscrowTransaction);
      mockEscrowRepository.save.mockResolvedValue(escrow);

      const result = await service.refundEscrow({
        escrowId: 'escrow_123',
        reason: 'Match cancelled',
      });

      expect(result.length).toBe(2);
    });
  });

  describe('getEscrowBalance', () => {
    it('should return escrow balance info', async () => {
      const escrow = {
        id: '1',
        escrowId: 'escrow_123',
        currentBalance: '2000000000',
        totalDeposited: '2000000000',
        totalReleased: '0',
        totalRefunded: '0',
        platformFeeCollected: '0',
        status: EscrowStatus.ACTIVE,
        transactions: [],
      } as unknown as EscrowAccount;

      mockEscrowRepository.findOne.mockResolvedValue(escrow);

      const result = await service.getEscrowBalance('escrow_123');

      expect(result.currentBalance).toBe('2000000000');
      expect(result.status).toBe(EscrowStatus.ACTIVE);
    });

    it('should throw if escrow not found', async () => {
      mockEscrowRepository.findOne.mockResolvedValue(null);

      await expect(service.getEscrowBalance('invalid_escrow')).rejects.toThrow(NotFoundException);
    });
  });
});
