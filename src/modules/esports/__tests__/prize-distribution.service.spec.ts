import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrizeDistributionService } from '../services/prize-distribution.service';
import {
  PrizeDistribution,
  PrizeDistributionStatus,
  PrizeSourceType,
} from '../entities/prize-distribution.entity';
import { Match, MatchStatus, MatchParticipant, ParticipantStatus } from '../entities/match.entity';
import {
  Tournament,
  TournamentStatus,
  TournamentRegistration,
  RegistrationStatus,
} from '../entities/tournament.entity';
import { EscrowService } from '../services/escrow.service';
import { PlayerWalletService } from '../services/player-wallet.service';
import { EscrowSourceType, EscrowStatus } from '../entities/escrow.entity';

describe('PrizeDistributionService', () => {
  let service: PrizeDistributionService;
  let prizeRepository: jest.Mocked<Repository<PrizeDistribution>>;
  let matchRepository: jest.Mocked<Repository<Match>>;
  let participantRepository: jest.Mocked<Repository<MatchParticipant>>;
  let tournamentRepository: jest.Mocked<Repository<Tournament>>;
  let registrationRepository: jest.Mocked<Repository<TournamentRegistration>>;
  let escrowService: jest.Mocked<EscrowService>;
  let walletService: jest.Mocked<PlayerWalletService>;

  const mockPrizeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockMatchRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockParticipantRepository = {
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockTournamentRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockRegistrationRepository = {
    find: jest.fn(),
  };

  const mockEscrowService = {
    getEscrowBySource: jest.fn(),
    getEscrowBalance: jest.fn(),
    releaseEscrow: jest.fn(),
  };

  const mockWalletService = {
    creditPrize: jest.fn(),
    getPlayerWallet: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrizeDistributionService,
        {
          provide: getRepositoryToken(PrizeDistribution),
          useValue: mockPrizeRepository,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepository,
        },
        {
          provide: getRepositoryToken(MatchParticipant),
          useValue: mockParticipantRepository,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepository,
        },
        {
          provide: getRepositoryToken(TournamentRegistration),
          useValue: mockRegistrationRepository,
        },
        {
          provide: EscrowService,
          useValue: mockEscrowService,
        },
        {
          provide: PlayerWalletService,
          useValue: mockWalletService,
        },
      ],
    }).compile();

    service = module.get<PrizeDistributionService>(PrizeDistributionService);
    prizeRepository = module.get(getRepositoryToken(PrizeDistribution));
    matchRepository = module.get(getRepositoryToken(Match));
    participantRepository = module.get(getRepositoryToken(MatchParticipant));
    tournamentRepository = module.get(getRepositoryToken(Tournament));
    registrationRepository = module.get(getRepositoryToken(TournamentRegistration));
    escrowService = module.get(EscrowService) as jest.Mocked<EscrowService>;
    walletService = module.get(PlayerWalletService) as jest.Mocked<PlayerWalletService>;

    jest.clearAllMocks();
  });

  describe('distributeMatchPrizes', () => {
    it('should distribute prizes to winner after match completion', async () => {
      const match = {
        id: 'uuid_123',
        matchId: 'match_123',
        status: MatchStatus.COMPLETED,
        winnerId: 'winner_player',
        entryFee: '1000000000',
        prizePool: '2000000000',
        platformFeePercent: 5,
        gameType: 'duel',
        result: {
          winnerIds: ['winner_player'],
        },
      } as unknown as Match;

      const participants = [
        {
          playerId: 'winner_player',
          walletId: 'wallet_1',
          placement: 1,
          status: ParticipantStatus.FINISHED,
        },
        {
          playerId: 'loser_player',
          walletId: 'wallet_2',
          placement: 2,
          status: ParticipantStatus.FINISHED,
        },
      ] as unknown as MatchParticipant[];

      mockEscrowService.getEscrowBySource.mockResolvedValue({
        escrowId: 'escrow_123',
        status: EscrowStatus.LOCKED,
      } as any);
      mockEscrowService.getEscrowBalance.mockResolvedValue({
        currentBalance: '2000000000',
      });
      mockPrizeRepository.create.mockReturnValue({
        sourceType: PrizeSourceType.MATCH,
        sourceId: 'match_123',
        totalPrizePool: '2000000000',
        platformFee: '100000000',
        distributableAmount: '1900000000',
        distributedAmount: '0',
        status: PrizeDistributionStatus.PROCESSING,
        distributions: [{ playerId: 'winner_player', status: 'pending' }],
        isFullyDistributed: jest.fn().mockReturnValue(true),
      } as unknown as PrizeDistribution);
      mockPrizeRepository.save.mockResolvedValue({
        id: 'prize_123',
        status: PrizeDistributionStatus.COMPLETED,
      } as PrizeDistribution);
      mockEscrowService.releaseEscrow.mockResolvedValue({} as any);
      mockWalletService.creditPrize.mockResolvedValue({} as any);
      mockParticipantRepository.update.mockResolvedValue({} as any);

      const result = await service.distributeMatchPrizes(match, participants);

      expect(result.status).toBe(PrizeDistributionStatus.COMPLETED);
      expect(mockWalletService.creditPrize).toHaveBeenCalled();
      expect(mockEscrowService.releaseEscrow).toHaveBeenCalled();
    });
  });

  describe('distributeTournamentPrizes', () => {
    it('should distribute prizes based on placement structure', async () => {
      const tournament = {
        id: 'uuid_123',
        tournamentId: 'tournament_123',
        status: TournamentStatus.COMPLETED,
        prizePool: '10000000000',
        platformFeePercent: 5,
        prizeStructure: [
          { place: 1, percentage: 50 },
          { place: 2, percentage: 30 },
          { place: 3, percentage: 20 },
        ],
      } as unknown as Tournament;

      const registrations = [
        {
          playerId: 'player_1',
          walletId: 'wallet_1',
          finalPlacement: 1,
          status: RegistrationStatus.CONFIRMED,
        },
        {
          playerId: 'player_2',
          walletId: 'wallet_2',
          finalPlacement: 2,
          status: RegistrationStatus.CONFIRMED,
        },
        {
          playerId: 'player_3',
          walletId: 'wallet_3',
          finalPlacement: 3,
          status: RegistrationStatus.CONFIRMED,
        },
      ] as unknown as TournamentRegistration[];

      mockEscrowService.getEscrowBySource.mockResolvedValue({
        escrowId: 'escrow_456',
        status: EscrowStatus.LOCKED,
      } as any);
      mockEscrowService.getEscrowBalance.mockResolvedValue({
        currentBalance: '10000000000',
      });
      mockPrizeRepository.create.mockReturnValue({
        sourceType: PrizeSourceType.TOURNAMENT,
        sourceId: 'tournament_123',
        totalPrizePool: '10000000000',
        platformFee: '500000000',
        distributableAmount: '9500000000',
        distributedAmount: '0',
        status: PrizeDistributionStatus.PROCESSING,
        distributions: [],
        isFullyDistributed: jest.fn().mockReturnValue(true),
      } as unknown as PrizeDistribution);
      mockPrizeRepository.save.mockResolvedValue({
        id: 'prize_456',
        status: PrizeDistributionStatus.COMPLETED,
      } as PrizeDistribution);
      mockEscrowService.releaseEscrow.mockResolvedValue({} as any);
      mockWalletService.creditPrize.mockResolvedValue({} as any);

      const result = await service.distributeTournamentPrizes(tournament, registrations);

      expect(result.status).toBe(PrizeDistributionStatus.COMPLETED);
      expect(mockWalletService.creditPrize).toHaveBeenCalledTimes(3);
    });
  });

  describe('getPrizeDistribution', () => {
    it('should return prize distribution by ID', async () => {
      const prize = {
        id: 'prize_123',
        sourceType: PrizeSourceType.MATCH,
        sourceId: 'match_123',
        status: PrizeDistributionStatus.COMPLETED,
      } as PrizeDistribution;

      mockPrizeRepository.findOne.mockResolvedValue(prize);

      const result = await service.getPrizeDistribution(PrizeSourceType.MATCH, 'match_123');

      expect(result.id).toBe('prize_123');
    });

    it('should throw if prize distribution not found', async () => {
      mockPrizeRepository.findOne.mockResolvedValue(null);

      const result = await service.getPrizeDistribution(PrizeSourceType.MATCH, 'invalid_id');
      expect(result).toBeNull();
    });
  });

  describe('getPrizeHistory', () => {
    it('should return prize history for player', async () => {
      const prizes = [
        {
          id: 'prize_1',
          sourceType: PrizeSourceType.MATCH,
          sourceId: 'match_1',
          status: PrizeDistributionStatus.COMPLETED,
        },
        {
          id: 'prize_2',
          sourceType: PrizeSourceType.TOURNAMENT,
          sourceId: 'tournament_1',
          status: PrizeDistributionStatus.COMPLETED,
        },
      ] as PrizeDistribution[];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(prizes),
      };
      mockPrizeRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getPrizeHistory({ playerId: 'player_123' });

      expect(result).toHaveLength(2);
    });
  });
});
