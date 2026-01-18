import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { MatchmakingService, CreateMatchRequest } from '../services/matchmaking.service';
import {
  Match,
  MatchStatus,
  GameType,
  MatchParticipant,
  ParticipantStatus,
} from '../entities/match.entity';
import { EscrowService } from '../services/escrow.service';
import { PlayerWalletService } from '../services/player-wallet.service';
import { PrizeDistributionService } from '../services/prize-distribution.service';
import { EscrowSourceType, EscrowStatus } from '../entities/escrow.entity';

describe('MatchmakingService', () => {
  let service: MatchmakingService;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let participantRepository: jest.Mocked<Repository<MatchParticipant>>;
  let escrowService: jest.Mocked<EscrowService>;
  let walletService: jest.Mocked<PlayerWalletService>;
  let prizeDistributionService: jest.Mocked<PrizeDistributionService>;

  const mockMatchRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockParticipantRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockEscrowService = {
    createEscrow: jest.fn(),
    depositToEscrow: jest.fn(),
    lockEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundEscrow: jest.fn(),
    getEscrowBalance: jest.fn(),
    getEscrowBySource: jest.fn(),
  };

  const mockWalletService = {
    lockFunds: jest.fn(),
    unlockFunds: jest.fn(),
    getBalance: jest.fn(),
    creditPrize: jest.fn(),
    getWallet: jest.fn(),
    deductEntryFee: jest.fn(),
  };

  const mockPrizeDistributionService = {
    distributeMatchPrizes: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchmakingService,
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepository,
        },
        {
          provide: getRepositoryToken(MatchParticipant),
          useValue: mockParticipantRepository,
        },
        {
          provide: EscrowService,
          useValue: mockEscrowService,
        },
        {
          provide: PlayerWalletService,
          useValue: mockWalletService,
        },
        {
          provide: PrizeDistributionService,
          useValue: mockPrizeDistributionService,
        },
      ],
    }).compile();

    service = module.get<MatchmakingService>(MatchmakingService);
    matchRepository = module.get(getRepositoryToken(Match));
    participantRepository = module.get(getRepositoryToken(MatchParticipant));
    escrowService = module.get(EscrowService) as jest.Mocked<EscrowService>;
    walletService = module.get(PlayerWalletService) as jest.Mocked<PlayerWalletService>;
    prizeDistributionService = module.get(
      PrizeDistributionService,
    ) as jest.Mocked<PrizeDistributionService>;

    jest.clearAllMocks();
  });

  describe('createMatch', () => {
    it('should create a match with escrow', async () => {
      const dto: CreateMatchRequest = {
        gameType: GameType.DUEL,
        entryFee: '1000000000',
        maxPlayers: 2,
      };

      mockMatchRepository.create.mockReturnValue({
        ...dto,
        matchId: 'match_123',
        status: MatchStatus.CREATED,
      } as Match);
      mockMatchRepository.save.mockResolvedValue({
        id: 'uuid_123',
        matchId: 'match_123',
        ...dto,
        status: MatchStatus.CREATED,
      } as Match);
      mockEscrowService.createEscrow.mockResolvedValue({
        id: 'escrow_123',
        escrowAddress: 'escrow_pda_123',
        sourceType: EscrowSourceType.MATCH,
        status: EscrowStatus.CREATED,
      } as any);

      const result = await service.createMatch(dto);

      expect(result.status).toBe(MatchStatus.CREATED);
      expect(mockEscrowService.createEscrow).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: EscrowSourceType.MATCH,
        }),
      );
    });

    it('should reject entry fee below minimum', async () => {
      const dto: CreateMatchRequest = {
        gameType: GameType.DUEL,
        entryFee: '100', // Too low
        maxPlayers: 2,
      };

      await expect(service.createMatch(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinMatch', () => {
    it('should allow player to join waiting match', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.WAITING,
        entryFee: '1000000000',
        prizePool: '1000000000',
        maxPlayers: 2,
        escrowAddress: 'escrow_pda_123',
        participants: [{ playerId: 'host_player' }],
        isJoinable: jest.fn().mockReturnValue(true),
        isReady: jest.fn().mockReturnValue(true),
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);
      mockParticipantRepository.findOne.mockResolvedValue(null);
      mockWalletService.getWallet.mockResolvedValue({
        id: 'wallet_joining',
        walletId: 'wallet_joining',
      } as any);
      mockWalletService.getBalance.mockResolvedValue({
        available: '5000000000',
        locked: '0',
        total: '5000000000',
      } as any);
      mockWalletService.lockFunds.mockResolvedValue({} as any);
      mockEscrowService.getEscrowBySource.mockResolvedValue({ escrowId: 'escrow_123' } as any);
      mockParticipantRepository.create.mockReturnValue({
        playerId: 'joining_player',
        status: ParticipantStatus.JOINED,
      } as MatchParticipant);
      mockParticipantRepository.save.mockResolvedValue({
        id: '2',
        playerId: 'joining_player',
      } as MatchParticipant);
      mockEscrowService.depositToEscrow.mockResolvedValue({} as any);
      mockParticipantRepository.count.mockResolvedValue(2);
      mockMatchRepository.save.mockResolvedValue({
        ...match,
        status: MatchStatus.READY,
      } as Match);

      const result = await service.joinMatch({
        matchId: 'match_123',
        playerId: 'joining_player',
      });

      expect(mockWalletService.lockFunds).toHaveBeenCalled();
      expect(mockEscrowService.depositToEscrow).toHaveBeenCalled();
    });

    it('should reject if player already joined', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.WAITING,
        participants: [{ playerId: 'joining_player' }],
        isJoinable: jest.fn().mockReturnValue(true),
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);
      mockParticipantRepository.findOne.mockResolvedValue({
        id: '1',
        playerId: 'joining_player',
      } as MatchParticipant);

      await expect(
        service.joinMatch({ matchId: 'match_123', playerId: 'joining_player' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startMatch', () => {
    it('should start a ready match and lock escrow', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.READY,
        escrowAddress: 'escrow_pda_123',
        participants: [
          { playerId: 'p1', status: ParticipantStatus.READY },
          { playerId: 'p2', status: ParticipantStatus.READY },
        ],
        canStart: jest.fn().mockReturnValue(true),
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);
      mockEscrowService.getEscrowBySource.mockResolvedValue({ escrowId: 'escrow_123' } as any);
      mockEscrowService.lockEscrow.mockResolvedValue({} as any);
      mockParticipantRepository.update.mockResolvedValue({} as any);
      mockMatchRepository.save.mockResolvedValue({
        ...match,
        status: MatchStatus.IN_PROGRESS,
        startedAt: new Date(),
      } as Match);

      const result = await service.startMatch('match_123');

      expect(result.status).toBe(MatchStatus.IN_PROGRESS);
      expect(mockEscrowService.lockEscrow).toHaveBeenCalled();
    });

    it('should reject if match not ready', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.WAITING,
        canStart: jest.fn().mockReturnValue(false),
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);

      await expect(service.startMatch('match_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitResult', () => {
    it('should record match result and trigger prize distribution', async () => {
      const participants = [
        { playerId: 'player_1', status: ParticipantStatus.PLAYING },
        { playerId: 'player_2', status: ParticipantStatus.PLAYING },
      ] as MatchParticipant[];

      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.IN_PROGRESS,
        participants: participants,
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);
      mockParticipantRepository.find.mockResolvedValue(participants);
      mockMatchRepository.save.mockResolvedValue({
        ...match,
        status: MatchStatus.COMPLETED,
        winnerId: 'player_1',
        endedAt: new Date(),
      } as Match);
      mockParticipantRepository.update.mockResolvedValue({} as any);
      mockPrizeDistributionService.distributeMatchPrizes.mockResolvedValue([]);

      const result = await service.submitResult({
        matchId: 'match_123',
        winnerIds: ['player_1'],
        scores: { player_1: 3, player_2: 1 },
        submittedBy: 'player_1',
      });

      // After submitResult, match is transitioned to SETTLED (after prize distribution)
      expect(result.status).toBe(MatchStatus.SETTLED);
      expect(result.winnerId).toBe('player_1');
    });

    it('should reject if match not in progress', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.READY,
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);

      await expect(
        service.submitResult({
          matchId: 'match_123',
          winnerIds: ['player_1'],
          submittedBy: 'player_1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelMatch', () => {
    it('should cancel match and refund participants', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.WAITING,
        escrowAddress: 'escrow_pda_123',
        entryFee: '1000000000',
        participants: [{ playerId: 'player_1', status: ParticipantStatus.JOINED }],
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);
      mockParticipantRepository.find.mockResolvedValue(match.participants as MatchParticipant[]);
      mockEscrowService.getEscrowBySource.mockResolvedValue({ escrowId: 'escrow_123' } as any);
      mockEscrowService.refundEscrow.mockResolvedValue({} as any);
      mockWalletService.unlockFunds.mockResolvedValue({} as any);
      mockParticipantRepository.save.mockResolvedValue({} as MatchParticipant);
      mockMatchRepository.save.mockResolvedValue({
        ...match,
        status: MatchStatus.CANCELLED,
      } as Match);

      const result = await service.cancelMatch('match_123');

      expect(result.status).toBe(MatchStatus.CANCELLED);
      expect(mockWalletService.unlockFunds).toHaveBeenCalled();
    });

    it('should reject cancel for completed/settled match', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.COMPLETED,
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);

      await expect(service.cancelMatch('match_123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMatch', () => {
    it('should return match with participants', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.WAITING,
        participants: [],
      } as unknown as Match;

      mockMatchRepository.findOne.mockResolvedValue(match);

      const result = await service.getMatch('match_123');

      expect(result.matchId).toBe('match_123');
    });

    it('should throw if match not found', async () => {
      mockMatchRepository.findOne.mockResolvedValue(null);

      await expect(service.getMatch('invalid_match')).rejects.toThrow(NotFoundException);
    });
  });
});
