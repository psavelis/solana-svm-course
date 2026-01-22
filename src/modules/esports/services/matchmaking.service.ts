import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';

import {
  Match,
  MatchStatus,
  GameType,
  MatchParticipant,
  ParticipantStatus,
} from '../entities/match.entity';
import { PrizeDistributionStrategy, PrizeRiskLevel } from '../entities/prize-distribution.entity';
import { EscrowService } from './escrow.service';
import { PlayerWalletService } from './player-wallet.service';
import { PrizeDistributionService, PRIZE_STRATEGY_CONFIG } from './prize-distribution.service';
import { EscrowSourceType } from '../entities/escrow.entity';
import {
  SupportedToken,
  getTokenConfig,
  getTokenMintAddress,
  isValidEntryFee,
  toDisplayAmount,
} from '../entities/token.entity';

/**
 * # Create Match Request
 *
 * Request interface for creating a new monetized match.
 *
 * ## Multi-Token Support
 *
 * The platform supports multiple token types for entry fees:
 *
 * | Token | Decimals | Use Case |
 * |-------|----------|----------|
 * | SOL | 9 | Native, low-fee transactions |
 * | USDC | 6 | Stable value, USD-pegged |
 * | USDT | 6 | Stable value, USD-pegged |
 * | PYUSD | 6 | PayPal USD, stable value |
 *
 * ## Token Selection Flow
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │                  TOKEN SELECTION FLOW                        │
 * ├──────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │  1. Creator selects token type (defaults to SOL)            │
 * │  2. Entry fee validated against token-specific limits       │
 * │  3. Token mint address resolved from TOKEN_CONFIG           │
 * │  4. Escrow created with token-specific account              │
 * │  5. All participants must pay in same token                 │
 * │                                                              │
 * │  IMPORTANT: Once created, match token type CANNOT change    │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```typescript
 * // Create match with USDC entry fee
 * const request: CreateMatchRequest = {
 *   gameType: GameType.BATTLE_ROYALE,
 *   tokenType: SupportedToken.USDC,
 *   entryFee: '5000000', // 5 USDC (6 decimals)
 *   maxPlayers: 100,
 *   prizeStrategy: PrizeDistributionStrategy.TOP_3_SPLIT,
 * };
 * ```
 */
export interface CreateMatchRequest {
  gameType: GameType;
  /** Entry fee in base units (lamports for SOL, micro-units for stablecoins) */
  entryFee: string;
  /**
   * Token type for entry fee and prize pool.
   * Defaults to SOL if not specified.
   * @see SupportedToken
   */
  tokenType?: SupportedToken;
  minPlayers?: number;
  maxPlayers?: number;
  platformFeePercent?: number;
  prizeStrategy?: PrizeDistributionStrategy;
  prizeStructure?: {
    place: number;
    percentage: number;
    label?: string;
    isMvp?: boolean;
  }[];
  scheduledAt?: Date;
  metadata?: {
    gameName?: string;
    gameMode?: string;
    region?: string;
    skillBracket?: string;
    rules?: Record<string, unknown>;
  };
}

export interface JoinMatchRequest {
  matchId: string;
  playerId: string;
  teamId?: string;
  displayName?: string;
}

export interface SubmitResultRequest {
  matchId: string;
  winnerIds: string[];
  scores?: Record<string, number>;
  mvpPlayerId?: string;
  mvpReason?: string;
  proof?: string;
  submittedBy: string;
}

export interface MatchQueryOptions {
  status?: MatchStatus;
  gameType?: GameType;
  prizeStrategy?: PrizeDistributionStrategy;
  riskLevel?: PrizeRiskLevel;
  /** Filter by specific token type */
  tokenType?: SupportedToken;
  /** Filter to only return stablecoin matches */
  stablecoinsOnly?: boolean;
  minEntryFee?: string;
  maxEntryFee?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchParticipant)
    private participantRepository: Repository<MatchParticipant>,
    private readonly escrowService: EscrowService,
    private readonly playerWalletService: PlayerWalletService,
    private readonly prizeDistributionService: PrizeDistributionService,
  ) {}

  /**
   * Create a new monetized match
   *
   * Creates a match with configurable prize distribution strategy:
   * - WINNER_TAKES_ALL (High Risk): 100% to winner
   * - TOP_3_SPLIT (Medium Risk): 60%/30%/10% to top 3
   * - PERFORMANCE_MVP (Low Risk): 70%/20%/10% (winner/2nd/MVP)
   * - CUSTOM: User-defined structure
   *
   * ## Multi-Token Support
   *
   * The match can use any supported token type for entry fees:
   * - SOL: Native token, 9 decimals
   * - USDC/USDT/PYUSD: Stablecoins, 6 decimals
   *
   * Entry fee limits are token-specific and defined in TOKEN_CONFIG.
   */
  async createMatch(request: CreateMatchRequest): Promise<Match> {
    const {
      gameType,
      entryFee,
      tokenType = SupportedToken.SOL,
      minPlayers = 2,
      maxPlayers = 2,
      platformFeePercent = 5.0,
      prizeStrategy = PrizeDistributionStrategy.WINNER_TAKES_ALL,
      prizeStructure,
      scheduledAt,
      metadata,
    } = request;

    // Get token configuration
    const tokenConfig = getTokenConfig(tokenType);
    const network = (process.env.SOLANA_NETWORK || 'mainnet') as 'mainnet' | 'devnet';
    const tokenMint = getTokenMintAddress(tokenType, network);

    // Validate entry fee against token-specific limits
    if (!isValidEntryFee(tokenType, entryFee)) {
      const displayMin = toDisplayAmount(tokenType, tokenConfig.minEntryFee);
      const displayMax = toDisplayAmount(tokenType, tokenConfig.maxEntryFee);
      throw new BadRequestException(
        `${tokenConfig.symbol} entry fee must be between ${displayMin} and ${displayMax} ${tokenConfig.symbol}`,
      );
    }

    // Validate prize structure if CUSTOM strategy
    if (prizeStrategy === PrizeDistributionStrategy.CUSTOM) {
      if (!prizeStructure || prizeStructure.length === 0) {
        throw new BadRequestException('Prize structure is required for CUSTOM strategy');
      }
      const totalPercentage = prizeStructure.reduce((sum, p) => sum + p.percentage, 0);
      if (totalPercentage !== 100) {
        throw new BadRequestException(
          `Prize structure percentages must sum to 100, got ${totalPercentage}`,
        );
      }
    }

    // Validate player count for strategies that require more placements
    if (prizeStrategy === PrizeDistributionStrategy.TOP_3_SPLIT && maxPlayers < 3) {
      throw new BadRequestException('TOP_3_SPLIT strategy requires at least 3 players');
    }
    if (prizeStrategy === PrizeDistributionStrategy.PERFORMANCE_MVP && maxPlayers < 2) {
      throw new BadRequestException('PERFORMANCE_MVP strategy requires at least 2 players');
    }

    // Determine risk level from strategy
    const riskLevel = PRIZE_STRATEGY_CONFIG[prizeStrategy].riskLevel;

    // Get default prize structure if not provided
    const finalPrizeStructure =
      prizeStructure ||
      (prizeStrategy !== PrizeDistributionStrategy.CUSTOM
        ? PRIZE_STRATEGY_CONFIG[prizeStrategy].structure
        : []);

    // Generate match ID
    const matchId = `match_${randomBytes(8).toString('hex')}`;

    // Create escrow account for the match with token-specific configuration
    const escrow = await this.escrowService.createEscrow({
      sourceType: EscrowSourceType.MATCH,
      sourceId: matchId,
      platformFeePercent,
      tokenType,
      tokenMint,
    });

    // Create match with token configuration
    const match = this.matchRepository.create({
      matchId,
      gameType,
      tokenType,
      tokenMint,
      entryFee,
      minPlayers,
      maxPlayers,
      prizePool: '0',
      platformFeePercent,
      prizeStrategy,
      riskLevel,
      prizeStructure: finalPrizeStructure,
      status: MatchStatus.CREATED,
      escrowAddress: escrow.escrowAddress,
      metadata,
      scheduledAt,
      participants: [],
    });

    const savedMatch = await this.matchRepository.save(match);

    const displayEntryFee = toDisplayAmount(tokenType, entryFee);
    this.logger.log(
      `Created match ${matchId}: ${gameType}, entry fee ${displayEntryFee} ${tokenConfig.symbol}, strategy ${prizeStrategy} (${riskLevel} risk)`,
    );

    return savedMatch;
  }

  /**
   * Player joins a match with entry fee
   */
  async joinMatch(request: JoinMatchRequest): Promise<MatchParticipant> {
    const { matchId, playerId, teamId, displayName } = request;

    const match = await this.getMatchById(matchId);

    if (!match.isJoinable()) {
      throw new BadRequestException(`Match ${matchId} is not accepting players`);
    }

    // Check if player already joined
    const existingParticipant = await this.participantRepository.findOne({
      where: { matchId: match.id, playerId },
    });

    if (existingParticipant) {
      throw new BadRequestException(`Player ${playerId} already joined match ${matchId}`);
    }

    // Get player wallet
    const wallet = await this.playerWalletService.getWallet(playerId);

    // Lock entry fee in player wallet
    await this.playerWalletService.lockFunds({
      playerId,
      amount: match.entryFee,
      reference: match.matchId,
    });

    try {
      // Get escrow for the match
      const escrow = await this.escrowService.getEscrowBySource(
        EscrowSourceType.MATCH,
        match.matchId,
      );

      // Deposit to escrow
      const depositTx = await this.escrowService.depositToEscrow({
        escrowId: escrow.escrowId,
        walletId: wallet.id,
        amount: match.entryFee,
        signature: `deposit_${randomBytes(16).toString('hex')}`,
      });

      // Deduct from player's locked balance
      await this.playerWalletService.deductEntryFee(playerId, match.entryFee, match.matchId);

      // Create participant record
      const participant = this.participantRepository.create({
        matchId: match.id,
        walletId: wallet.id,
        playerId,
        status: ParticipantStatus.JOINED,
        entrySignature: depositTx.signature,
        joinedAt: new Date(),
        metadata: {
          teamId,
          displayName,
        },
      });

      await this.participantRepository.save(participant);

      // Update match prize pool and status
      match.prizePool = (BigInt(match.prizePool) + BigInt(match.entryFee)).toString();

      if (match.status === MatchStatus.CREATED) {
        match.status = MatchStatus.WAITING;
      }

      if (match.isReady()) {
        match.status = MatchStatus.READY;
      }

      await this.matchRepository.save(match);

      this.logger.log(`Player ${playerId} joined match ${matchId}`);

      return participant;
    } catch (error) {
      // Rollback: unlock funds if escrow deposit fails
      await this.playerWalletService.unlockFunds({
        playerId,
        amount: match.entryFee,
        reference: match.matchId,
      });
      throw error;
    }
  }

  /**
   * Start a match (lock escrow)
   */
  async startMatch(matchId: string): Promise<Match> {
    const match = await this.getMatchById(matchId);

    if (!match.canStart()) {
      throw new BadRequestException(`Match ${matchId} cannot be started`);
    }

    // Lock escrow
    const escrow = await this.escrowService.getEscrowBySource(EscrowSourceType.MATCH, matchId);
    await this.escrowService.lockEscrow(escrow.escrowId);

    // Update participant status
    await this.participantRepository.update(
      { matchId: match.id, status: ParticipantStatus.JOINED },
      { status: ParticipantStatus.PLAYING },
    );

    match.status = MatchStatus.IN_PROGRESS;
    match.startedAt = new Date();

    await this.matchRepository.save(match);

    this.logger.log(`Started match ${matchId}`);

    return match;
  }

  /**
   * Submit match result and trigger prize distribution
   *
   * Validates result data and distributes prizes based on the match's strategy:
   * - For PERFORMANCE_MVP: requires mvpPlayerId in request
   * - For TOP_3_SPLIT: distributes to top 3 based on scores
   * - For WINNER_TAKES_ALL: gives 100% to first winner
   */
  async submitResult(request: SubmitResultRequest): Promise<Match> {
    const { matchId, winnerIds, scores, mvpPlayerId, mvpReason, proof, submittedBy } = request;

    const match = await this.getMatchById(matchId);

    if (match.status !== MatchStatus.IN_PROGRESS) {
      throw new BadRequestException(`Match ${matchId} is not in progress`);
    }

    // Validate winners are participants
    const participants = await this.participantRepository.find({
      where: { matchId: match.id },
    });

    const participantPlayerIds = participants.map((p) => p.playerId);
    const invalidWinners = winnerIds.filter((id) => !participantPlayerIds.includes(id));

    if (invalidWinners.length > 0) {
      throw new BadRequestException(`Invalid winner IDs: ${invalidWinners.join(', ')}`);
    }

    // Validate MVP for PERFORMANCE_MVP strategy
    if (match.prizeStrategy === PrizeDistributionStrategy.PERFORMANCE_MVP) {
      if (!mvpPlayerId) {
        throw new BadRequestException(
          'MVP player ID is required for PERFORMANCE_MVP prize strategy',
        );
      }
      if (!participantPlayerIds.includes(mvpPlayerId)) {
        throw new BadRequestException(`MVP player ${mvpPlayerId} is not a match participant`);
      }
    }

    // Update match result
    match.result = {
      winnerIds,
      scores,
      proof,
      submittedBy,
      verifiedAt: new Date(),
      mvpPlayerId,
      mvpReason,
    };
    match.status = MatchStatus.COMPLETED;
    match.endedAt = new Date();
    match.winnerId = winnerIds[0]; // Primary winner

    await this.matchRepository.save(match);

    // Update participant placements based on scores or winner order
    const rankedPlayerIds = scores
      ? Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([id]) => id)
      : winnerIds;

    for (let i = 0; i < rankedPlayerIds.length; i++) {
      const playerId = rankedPlayerIds[i];
      await this.participantRepository.update(
        { matchId: match.id, playerId },
        {
          status: ParticipantStatus.FINISHED,
          placement: i + 1,
        },
      );
    }

    // Mark losers
    const loserIds = participantPlayerIds.filter((id) => !winnerIds.includes(id));
    for (const loserId of loserIds) {
      await this.participantRepository.update(
        { matchId: match.id, playerId: loserId },
        {
          status: ParticipantStatus.FINISHED,
          placement: winnerIds.length + 1,
        },
      );
    }

    // Trigger prize distribution
    await this.prizeDistributionService.distributeMatchPrizes(match, participants);

    // Update match to settled
    match.status = MatchStatus.SETTLED;
    await this.matchRepository.save(match);

    this.logger.log(`Match ${matchId} completed. Winners: ${winnerIds.join(', ')}`);

    return match;
  }

  /**
   * Cancel a match and refund participants
   */
  async cancelMatch(matchId: string, reason?: string): Promise<Match> {
    const match = await this.getMatchById(matchId);

    if (
      [MatchStatus.COMPLETED, MatchStatus.SETTLED, MatchStatus.CANCELLED].includes(match.status)
    ) {
      throw new BadRequestException(`Match ${matchId} cannot be cancelled`);
    }

    const escrow = await this.escrowService.getEscrowBySource(EscrowSourceType.MATCH, matchId);

    // Refund all participants
    await this.escrowService.refundEscrow({
      escrowId: escrow.escrowId,
      reason: reason || 'Match cancelled',
    });

    // Credit refunds back to player wallets
    const participants = await this.participantRepository.find({
      where: {
        matchId: match.id,
        status: In([ParticipantStatus.JOINED, ParticipantStatus.PLAYING]),
      },
    });

    for (const participant of participants) {
      await this.playerWalletService.unlockFunds({
        playerId: participant.playerId,
        amount: match.entryFee,
        reference: match.matchId,
      });

      participant.status = ParticipantStatus.WITHDRAWN;
      await this.participantRepository.save(participant);
    }

    match.status = MatchStatus.CANCELLED;
    match.endedAt = new Date();

    await this.matchRepository.save(match);

    this.logger.log(`Cancelled match ${matchId}`);

    return match;
  }

  /**
   * Get match by ID
   */
  async getMatch(matchId: string): Promise<Match> {
    return this.getMatchById(matchId);
  }

  /**
   * Get matches with filtering
   *
   * Supports filtering by strategy and risk level.
   */
  async getMatches(options: MatchQueryOptions = {}): Promise<Match[]> {
    const {
      status,
      gameType,
      prizeStrategy,
      riskLevel,
      minEntryFee,
      maxEntryFee,
      limit = 20,
      offset = 0,
    } = options;

    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.participants', 'participants');

    if (status) {
      query.andWhere('match.status = :status', { status });
    }

    if (gameType) {
      query.andWhere('match.gameType = :gameType', { gameType });
    }

    if (prizeStrategy) {
      query.andWhere('match.prizeStrategy = :prizeStrategy', { prizeStrategy });
    }

    if (riskLevel) {
      query.andWhere('match.riskLevel = :riskLevel', { riskLevel });
    }

    if (minEntryFee) {
      query.andWhere('CAST(match.entryFee AS BIGINT) >= :minEntryFee', {
        minEntryFee: BigInt(minEntryFee),
      });
    }

    if (maxEntryFee) {
      query.andWhere('CAST(match.entryFee AS BIGINT) <= :maxEntryFee', {
        maxEntryFee: BigInt(maxEntryFee),
      });
    }

    query.orderBy('match.createdAt', 'DESC').skip(offset).take(limit);

    return query.getMany();
  }

  /**
   * Get match participants
   */
  async getMatchParticipants(matchId: string): Promise<MatchParticipant[]> {
    const match = await this.getMatchById(matchId);

    return this.participantRepository.find({
      where: { matchId: match.id },
      order: { joinedAt: 'ASC' },
    });
  }

  /**
   * Find available matches for matchmaking
   */
  async findAvailableMatches(
    gameType: GameType,
    maxEntryFee?: string,
    region?: string,
  ): Promise<Match[]> {
    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.participants', 'participants')
      .where('match.status IN (:...statuses)', {
        statuses: [MatchStatus.CREATED, MatchStatus.WAITING],
      })
      .andWhere('match.gameType = :gameType', { gameType });

    if (maxEntryFee) {
      query.andWhere('CAST(match.entryFee AS BIGINT) <= :maxEntryFee', {
        maxEntryFee: BigInt(maxEntryFee),
      });
    }

    if (region) {
      query.andWhere("match.metadata->>'region' = :region", { region });
    }

    query.orderBy('match.createdAt', 'ASC');

    return query.getMany();
  }

  // Private helpers

  private async getMatchById(matchId: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { matchId },
      relations: ['participants'],
    });

    if (!match) {
      throw new NotFoundException(`Match ${matchId} not found`);
    }

    return match;
  }
}
