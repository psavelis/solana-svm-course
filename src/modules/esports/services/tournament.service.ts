import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomBytes } from 'crypto';

import {
  Tournament,
  TournamentStatus,
  BracketType,
  TournamentRegistration,
  RegistrationStatus,
} from '../entities/tournament.entity';
import { PrizeDistributionStrategy, PrizeRiskLevel } from '../entities/prize-distribution.entity';
import { EscrowService } from './escrow.service';
import { PlayerWalletService } from './player-wallet.service';
import { MatchmakingService, CreateMatchRequest } from './matchmaking.service';
import { PrizeDistributionService, PRIZE_STRATEGY_CONFIG } from './prize-distribution.service';
import { EscrowSourceType } from '../entities/escrow.entity';
import { GameType, MatchStatus } from '../entities/match.entity';
import {
  SupportedToken,
  getTokenConfig,
  getTokenMintAddress,
  isValidEntryFee,
  toDisplayAmount,
  isStablecoin,
  getStablecoins,
} from '../entities/token.entity';

/**
 * # Create Tournament Request
 *
 * Request interface for creating a new tournament.
 *
 * ## Multi-Token Tournament Support
 *
 * Tournaments can be denominated in any supported token:
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │            TOURNAMENT TOKEN CONSIDERATIONS                   │
 * ├──────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │  STABLECOIN TOURNAMENTS (USDC, USDT, PYUSD):                │
 * │    ✓ Fixed USD value for entry fees and prizes              │
 * │    ✓ No volatility during multi-day events                  │
 * │    ✓ Easier financial planning for organizers               │
 * │    ✓ Clear tax reporting values                             │
 * │                                                              │
 * │  SOL TOURNAMENTS:                                            │
 * │    ✓ Lower transaction fees                                  │
 * │    ✓ Native token advantages                                 │
 * │    ✗ Prize pool value may fluctuate                         │
 * │    ✗ Entry fee USD value varies                             │
 * │                                                              │
 * │  GUARANTEED PRIZE POOLS:                                     │
 * │    • Must be in same token as entry fee                     │
 * │    • Organizer must escrow guarantee amount                 │
 * │    • Released if registration doesn't cover                 │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 * ```
 *
 * @example
 * ```typescript
 * // Create USDC tournament with guaranteed prize
 * const request: CreateTournamentRequest = {
 *   name: 'Monthly Championship',
 *   gameType: 'BATTLE_ROYALE',
 *   tokenType: SupportedToken.USDC,
 *   entryFee: '10000000', // 10 USDC
 *   guaranteedPrizePool: '100000000', // 100 USDC minimum prize
 *   maxParticipants: 64,
 *   bracketType: BracketType.SINGLE_ELIMINATION,
 * };
 * ```
 */
export interface CreateTournamentRequest {
  name: string;
  description?: string;
  gameType: string;
  /** Entry fee in base units (lamports for SOL, micro-units for stablecoins) */
  entryFee: string;
  /**
   * Token type for entry fee and prize pool.
   * Defaults to SOL if not specified.
   * @see SupportedToken
   */
  tokenType?: SupportedToken;
  /** Guaranteed minimum prize pool (must be in same token as entry fee) */
  guaranteedPrizePool?: string;
  maxParticipants: number;
  minParticipants?: number;
  bracketType: BracketType;
  platformFeePercent?: number;
  prizeStrategy?: PrizeDistributionStrategy;
  prizeStructure?: {
    place: number;
    percentage: number;
    fixedAmount?: string;
    label?: string;
    isMvp?: boolean;
  }[];
  registrationStart: Date;
  registrationEnd: Date;
  startDate: Date;
  metadata?: {
    region?: string;
    skillBracket?: string;
    rules?: string;
    streamUrl?: string;
    organizerId?: string;
  };
}

export interface RegisterPlayerRequest {
  tournamentId: string;
  playerId: string;
  teamName?: string;
  displayName?: string;
}

export interface TournamentQueryOptions {
  status?: TournamentStatus;
  gameType?: string;
  prizeStrategy?: PrizeDistributionStrategy;
  riskLevel?: PrizeRiskLevel;
  /** Filter by specific token type */
  tokenType?: SupportedToken;
  /** Filter to only return stablecoin tournaments */
  stablecoinsOnly?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    private readonly escrowService: EscrowService,
    private readonly playerWalletService: PlayerWalletService,
    private readonly matchmakingService: MatchmakingService,
    private readonly prizeDistributionService: PrizeDistributionService,
  ) {}

  /**
   * Create a new tournament
   *
   * Tournaments support configurable prize distribution strategies:
   * - TOP_3_SPLIT (default): 60%/30%/10% to top 3
   * - WINNER_TAKES_ALL: 100% to winner
   * - PERFORMANCE_MVP: 70%/20%/10% (winner/2nd/MVP)
   * - CUSTOM: User-defined structure
   *
   * ## Multi-Token Support
   *
   * Tournaments can use any supported token type (SOL, USDC, USDT, PYUSD).
   * Entry fee limits are validated per token configuration.
   */
  async createTournament(request: CreateTournamentRequest): Promise<Tournament> {
    const {
      name,
      description,
      gameType,
      entryFee,
      tokenType = SupportedToken.SOL,
      guaranteedPrizePool = '0',
      maxParticipants,
      minParticipants = 2,
      bracketType,
      platformFeePercent = 5.0,
      prizeStrategy = PrizeDistributionStrategy.TOP_3_SPLIT,
      prizeStructure,
      registrationStart,
      registrationEnd,
      startDate,
      metadata,
    } = request;

    // Get token configuration and mint address
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

    // Determine risk level from strategy
    const riskLevel = PRIZE_STRATEGY_CONFIG[prizeStrategy].riskLevel;

    // Get default prize structure if not provided
    let finalPrizeStructure = prizeStructure;
    if (!finalPrizeStructure || finalPrizeStructure.length === 0) {
      finalPrizeStructure = PRIZE_STRATEGY_CONFIG[prizeStrategy].structure.map((s) => ({
        place: s.place,
        percentage: s.percentage,
        label: s.label,
        isMvp: s.isMvp,
      }));
    }

    // Validate prize structure
    const totalPercentage = finalPrizeStructure.reduce((sum, ps) => sum + ps.percentage, 0);
    if (totalPercentage > 100) {
      throw new BadRequestException(`Prize structure exceeds 100%: ${totalPercentage}%`);
    }

    // Validate max participants for bracket type
    this.validateParticipantCount(bracketType, maxParticipants);

    const tournamentId = `tournament_${randomBytes(8).toString('hex')}`;

    // Create escrow with token-specific configuration
    const escrow = await this.escrowService.createEscrow({
      sourceType: EscrowSourceType.TOURNAMENT,
      sourceId: tournamentId,
      platformFeePercent,
      tokenType,
      tokenMint,
    });

    const tournament = this.tournamentRepository.create({
      tournamentId,
      name,
      description,
      gameType,
      tokenType,
      tokenMint,
      entryFee,
      prizePool: '0',
      guaranteedPrizePool,
      maxParticipants,
      minParticipants,
      bracketType,
      status: TournamentStatus.DRAFT,
      platformFeePercent,
      prizeStrategy,
      riskLevel,
      prizeStructure: finalPrizeStructure,
      escrowAddress: escrow.escrowAddress,
      metadata,
      registrationStart,
      registrationEnd,
      startDate,
      registrations: [],
    });

    const savedTournament = await this.tournamentRepository.save(tournament);

    const displayEntryFee = toDisplayAmount(tokenType, entryFee);
    this.logger.log(
      `Created tournament ${tournamentId}: ${name}, entry ${displayEntryFee} ${tokenConfig.symbol}, strategy ${prizeStrategy} (${riskLevel} risk)`,
    );

    return savedTournament;
  }

  /**
   * Open tournament registration
   */
  async openRegistration(tournamentId: string): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (tournament.status !== TournamentStatus.DRAFT) {
      throw new BadRequestException(`Tournament ${tournamentId} cannot open registration`);
    }

    tournament.status = TournamentStatus.REGISTRATION_OPEN;
    await this.tournamentRepository.save(tournament);

    this.logger.log(`Opened registration for tournament ${tournamentId}`);

    return tournament;
  }

  /**
   * Register a player for the tournament
   */
  async registerPlayer(request: RegisterPlayerRequest): Promise<TournamentRegistration> {
    const { tournamentId, playerId, teamName, displayName } = request;

    const tournament = await this.getTournamentById(tournamentId);

    if (!tournament.isRegistrationOpen()) {
      throw new BadRequestException(`Tournament ${tournamentId} registration is not open`);
    }

    // Check if already registered
    const existing = await this.registrationRepository.findOne({
      where: { tournamentId: tournament.id, playerId },
    });

    if (existing) {
      throw new BadRequestException(`Player ${playerId} already registered`);
    }

    // Get player wallet
    const wallet = await this.playerWalletService.getWallet(playerId);

    // Lock entry fee
    await this.playerWalletService.lockFunds({
      playerId,
      amount: tournament.entryFee,
      reference: tournament.tournamentId,
    });

    try {
      // Deposit to escrow
      const escrow = await this.escrowService.getEscrowBySource(
        EscrowSourceType.TOURNAMENT,
        tournament.tournamentId,
      );

      const depositTx = await this.escrowService.depositToEscrow({
        escrowId: escrow.escrowId,
        walletId: wallet.id,
        amount: tournament.entryFee,
        signature: `deposit_${randomBytes(16).toString('hex')}`,
      });

      // Deduct from player wallet
      await this.playerWalletService.deductEntryFee(
        playerId,
        tournament.entryFee,
        tournament.tournamentId,
      );

      // Create registration
      const registration = this.registrationRepository.create({
        tournamentId: tournament.id,
        walletId: wallet.id,
        playerId,
        status: RegistrationStatus.CONFIRMED,
        paymentSignature: depositTx.signature,
        registeredAt: new Date(),
        metadata: {
          teamName,
          displayName,
        },
      });

      await this.registrationRepository.save(registration);

      // Update prize pool
      tournament.prizePool = (
        BigInt(tournament.prizePool) + BigInt(tournament.entryFee)
      ).toString();
      await this.tournamentRepository.save(tournament);

      this.logger.log(`Player ${playerId} registered for tournament ${tournamentId}`);

      return registration;
    } catch (error) {
      // Rollback
      await this.playerWalletService.unlockFunds({
        playerId,
        amount: tournament.entryFee,
        reference: tournament.tournamentId,
      });
      throw error;
    }
  }

  /**
   * Close registration
   */
  async closeRegistration(tournamentId: string): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (tournament.status !== TournamentStatus.REGISTRATION_OPEN) {
      throw new BadRequestException(`Tournament ${tournamentId} registration is not open`);
    }

    tournament.status = TournamentStatus.REGISTRATION_CLOSED;
    await this.tournamentRepository.save(tournament);

    this.logger.log(`Closed registration for tournament ${tournamentId}`);

    return tournament;
  }

  /**
   * Generate tournament bracket
   */
  async generateBracket(tournamentId: string): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (!tournament.canGenerateBracket()) {
      throw new BadRequestException(`Tournament ${tournamentId} cannot generate bracket`);
    }

    const registrations = await this.registrationRepository.find({
      where: {
        tournamentId: tournament.id,
        status: In([RegistrationStatus.CONFIRMED, RegistrationStatus.CHECKED_IN]),
      },
    });

    if (registrations.length < tournament.minParticipants) {
      throw new BadRequestException(
        `Insufficient participants: ${registrations.length}/${tournament.minParticipants}`,
      );
    }

    // Seed players (by skill rating or random)
    const seededPlayers = this.seedPlayers(registrations);

    // Generate bracket based on type
    const bracket = this.generateBracketStructure(tournament.bracketType, seededPlayers);

    tournament.bracket = bracket;
    tournament.status = TournamentStatus.BRACKET_GENERATED;

    // Update registration seeds
    for (let i = 0; i < seededPlayers.length; i++) {
      await this.registrationRepository.update({ id: seededPlayers[i].id }, { seed: i + 1 });
    }

    await this.tournamentRepository.save(tournament);

    // Lock escrow
    const escrow = await this.escrowService.getEscrowBySource(
      EscrowSourceType.TOURNAMENT,
      tournament.tournamentId,
    );
    await this.escrowService.lockEscrow(escrow.escrowId);

    this.logger.log(`Generated bracket for tournament ${tournamentId}`);

    return tournament;
  }

  /**
   * Start tournament
   */
  async startTournament(tournamentId: string): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (tournament.status !== TournamentStatus.BRACKET_GENERATED) {
      throw new BadRequestException(`Tournament ${tournamentId} bracket not generated`);
    }

    // Create first round matches
    const firstRoundMatches = tournament.bracket?.rounds[0]?.matches || [];

    for (const matchInfo of firstRoundMatches) {
      if (matchInfo.player1Id && matchInfo.player2Id) {
        // Create actual match
        await this.matchmakingService.createMatch({
          gameType: tournament.gameType as GameType,
          entryFee: '0', // Entry already paid to tournament
          minPlayers: 2,
          maxPlayers: 2,
          platformFeePercent: 0, // Fee handled at tournament level
          metadata: {
            gameName: tournament.gameType,
            region: tournament.metadata?.region,
          },
        });
      }
    }

    tournament.status = TournamentStatus.IN_PROGRESS;
    await this.tournamentRepository.save(tournament);

    this.logger.log(`Started tournament ${tournamentId}`);

    return tournament;
  }

  /**
   * Advance to next round
   */
  async advanceRound(
    tournamentId: string,
    results: { matchId: string; winnerId: string; scores?: Record<string, number> }[],
  ): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (tournament.status !== TournamentStatus.IN_PROGRESS) {
      throw new BadRequestException(`Tournament ${tournamentId} is not in progress`);
    }

    // Update bracket with results
    for (const result of results) {
      for (const round of tournament.bracket.rounds) {
        const match = round.matches.find((m) => m.matchId === result.matchId);
        if (match) {
          match.winnerId = result.winnerId;
          match.status = 'completed';
        }
      }
    }

    // Check if tournament is complete
    const finalRound = tournament.bracket.rounds[tournament.bracket.rounds.length - 1];
    const finalMatch = finalRound?.matches[0];

    if (finalMatch?.winnerId) {
      // Tournament complete
      tournament.status = TournamentStatus.COMPLETED;
      tournament.endDate = new Date();

      // Update final placements
      const registrations = await this.registrationRepository.find({
        where: { tournamentId: tournament.id },
      });

      // Simple placement calculation for single elimination
      // Winner = 1st, Runner-up = 2nd, etc.
      await this.calculateFinalPlacements(tournament, registrations);

      // Distribute prizes
      const updatedRegistrations = await this.registrationRepository.find({
        where: { tournamentId: tournament.id },
      });

      await this.prizeDistributionService.distributeTournamentPrizes(
        tournament,
        updatedRegistrations,
      );

      this.logger.log(`Tournament ${tournamentId} completed. Winner: ${finalMatch.winnerId}`);
    } else {
      // Advance winners to next round
      this.advanceWinnersToNextRound(tournament.bracket, results);
    }

    await this.tournamentRepository.save(tournament);

    return tournament;
  }

  /**
   * Cancel tournament and refund
   */
  async cancelTournament(tournamentId: string, reason?: string): Promise<Tournament> {
    const tournament = await this.getTournamentById(tournamentId);

    if (tournament.status === TournamentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot cancel completed tournament`);
    }

    // Refund all registrations
    const escrow = await this.escrowService.getEscrowBySource(
      EscrowSourceType.TOURNAMENT,
      tournament.tournamentId,
    );

    await this.escrowService.refundEscrow({
      escrowId: escrow.escrowId,
      reason: reason || 'Tournament cancelled',
    });

    // Credit back to player wallets
    const registrations = await this.registrationRepository.find({
      where: { tournamentId: tournament.id, status: RegistrationStatus.CONFIRMED },
    });

    for (const reg of registrations) {
      await this.playerWalletService.unlockFunds({
        playerId: reg.playerId,
        amount: tournament.entryFee,
        reference: tournament.tournamentId,
      });

      reg.status = RegistrationStatus.WITHDRAWN;
      await this.registrationRepository.save(reg);
    }

    tournament.status = TournamentStatus.CANCELLED;
    tournament.endDate = new Date();

    await this.tournamentRepository.save(tournament);

    this.logger.log(`Cancelled tournament ${tournamentId}`);

    return tournament;
  }

  /**
   * Get tournament
   */
  async getTournament(tournamentId: string): Promise<Tournament> {
    return this.getTournamentById(tournamentId);
  }

  /**
   * Get tournaments with filters
   */
  /**
   * Get tournaments with filtering
   *
   * Supports filtering by strategy and risk level.
   */
  async getTournaments(options: TournamentQueryOptions = {}): Promise<Tournament[]> {
    const { status, gameType, prizeStrategy, riskLevel, limit = 20, offset = 0 } = options;

    const query = this.tournamentRepository
      .createQueryBuilder('tournament')
      .leftJoinAndSelect('tournament.registrations', 'registrations');

    if (status) {
      query.andWhere('tournament.status = :status', { status });
    }

    if (gameType) {
      query.andWhere('tournament.gameType = :gameType', { gameType });
    }

    if (prizeStrategy) {
      query.andWhere('tournament.prizeStrategy = :prizeStrategy', { prizeStrategy });
    }

    if (riskLevel) {
      query.andWhere('tournament.riskLevel = :riskLevel', { riskLevel });
    }

    query.orderBy('tournament.startDate', 'ASC').skip(offset).take(limit);

    return query.getMany();
  }

  /**
   * Get tournament registrations
   */
  async getRegistrations(tournamentId: string): Promise<TournamentRegistration[]> {
    const tournament = await this.getTournamentById(tournamentId);

    return this.registrationRepository.find({
      where: { tournamentId: tournament.id },
      order: { seed: 'ASC', registeredAt: 'ASC' },
    });
  }

  // Private helpers

  private async getTournamentById(tournamentId: string): Promise<Tournament> {
    const tournament = await this.tournamentRepository.findOne({
      where: { tournamentId },
      relations: ['registrations'],
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${tournamentId} not found`);
    }

    return tournament;
  }

  private validateParticipantCount(bracketType: BracketType, count: number): void {
    if (
      bracketType === BracketType.SINGLE_ELIMINATION ||
      bracketType === BracketType.DOUBLE_ELIMINATION
    ) {
      // Should be power of 2 for clean brackets
      const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;
      if (!isPowerOfTwo(count)) {
        this.logger.warn(`Max participants ${count} is not a power of 2, will have byes`);
      }
    }
  }

  private seedPlayers(registrations: TournamentRegistration[]): TournamentRegistration[] {
    // Sort by skill rating if available, otherwise random shuffle
    return registrations.sort((a, b) => {
      const ratingA = a.metadata?.skillRating || 0;
      const ratingB = b.metadata?.skillRating || 0;
      if (ratingA !== ratingB) {
        return ratingB - ratingA; // Higher rating first
      }
      return Math.random() - 0.5; // Random for ties
    });
  }

  private generateBracketStructure(
    bracketType: BracketType,
    players: TournamentRegistration[],
  ): Tournament['bracket'] {
    const rounds: Tournament['bracket']['rounds'] = [];
    let currentRoundPlayers = players.map((p) => p.playerId);

    // Calculate number of rounds for single elimination
    const numRounds = Math.ceil(Math.log2(currentRoundPlayers.length));

    // Pad to power of 2 if needed (byes)
    const targetSize = Math.pow(2, numRounds);
    while (currentRoundPlayers.length < targetSize) {
      currentRoundPlayers.push(null); // Bye
    }

    for (let round = 1; round <= numRounds; round++) {
      const matches: Tournament['bracket']['rounds'][0]['matches'] = [];
      const numMatches = currentRoundPlayers.length / 2;

      for (let i = 0; i < numMatches; i++) {
        const player1 = currentRoundPlayers[i * 2];
        const player2 = currentRoundPlayers[i * 2 + 1];

        const matchId = `${round}_${i + 1}_${randomBytes(4).toString('hex')}`;

        // Handle byes
        let winnerId: string | undefined;
        let status = 'pending';

        if (!player1 && player2) {
          winnerId = player2;
          status = 'bye';
        } else if (player1 && !player2) {
          winnerId = player1;
          status = 'bye';
        }

        matches.push({
          matchId,
          player1Id: player1 || undefined,
          player2Id: player2 || undefined,
          winnerId,
          status,
        });
      }

      rounds.push({ roundNumber: round, matches });

      // Prepare next round (winners advance)
      currentRoundPlayers = matches.map((m) => m.winnerId || null);
    }

    return { rounds };
  }

  private advanceWinnersToNextRound(
    bracket: Tournament['bracket'],
    results: { matchId: string; winnerId: string }[],
  ): void {
    // Find current round (first incomplete round)
    for (let i = 0; i < bracket.rounds.length - 1; i++) {
      const round = bracket.rounds[i];
      const allComplete = round.matches.every((m) => m.winnerId);

      if (allComplete) {
        // Populate next round
        const nextRound = bracket.rounds[i + 1];
        const winners = round.matches.map((m) => m.winnerId);

        for (let j = 0; j < nextRound.matches.length; j++) {
          const match = nextRound.matches[j];
          match.player1Id = winners[j * 2] || undefined;
          match.player2Id = winners[j * 2 + 1] || undefined;

          // Handle byes
          if (match.player1Id && !match.player2Id) {
            match.winnerId = match.player1Id;
            match.status = 'bye';
          } else if (!match.player1Id && match.player2Id) {
            match.winnerId = match.player2Id;
            match.status = 'bye';
          }
        }
      }
    }
  }

  private async calculateFinalPlacements(
    tournament: Tournament,
    registrations: TournamentRegistration[],
  ): Promise<void> {
    // For single elimination, we can infer placements from the bracket
    const rounds = tournament.bracket?.rounds || [];
    const placements = new Map<string, number>();

    // Work backwards through rounds
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i];
      const basePlacement = Math.pow(2, rounds.length - i);

      for (const match of round.matches) {
        if (i === rounds.length - 1 && match.winnerId) {
          // Finals
          placements.set(match.winnerId, 1);
          const loserId = match.player1Id === match.winnerId ? match.player2Id : match.player1Id;
          if (loserId) {
            placements.set(loserId, 2);
          }
        } else if (match.winnerId) {
          // Other rounds - losers get placement based on round eliminated
          const loserId = match.player1Id === match.winnerId ? match.player2Id : match.player1Id;
          if (loserId && !placements.has(loserId)) {
            placements.set(loserId, basePlacement);
          }
        }
      }
    }

    // Update registrations with placements
    for (const [playerId, placement] of placements) {
      await this.registrationRepository.update(
        { tournamentId: tournament.id, playerId },
        { finalPlacement: placement },
      );
    }
  }
}
