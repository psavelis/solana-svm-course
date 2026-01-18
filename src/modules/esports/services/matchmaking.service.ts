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
import { EscrowService } from './escrow.service';
import { PlayerWalletService } from './player-wallet.service';
import { PrizeDistributionService } from './prize-distribution.service';
import { EscrowSourceType } from '../entities/escrow.entity';

export interface CreateMatchRequest {
  gameType: GameType;
  entryFee: string;
  minPlayers?: number;
  maxPlayers?: number;
  platformFeePercent?: number;
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
  proof?: string;
  submittedBy: string;
}

export interface MatchQueryOptions {
  status?: MatchStatus;
  gameType?: GameType;
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
   */
  async createMatch(request: CreateMatchRequest): Promise<Match> {
    const {
      gameType,
      entryFee,
      minPlayers = 2,
      maxPlayers = 2,
      platformFeePercent = 5.0,
      scheduledAt,
      metadata,
    } = request;

    // Validate entry fee
    const minEntryFee = BigInt(process.env.ESPORTS_MIN_ENTRY_FEE_LAMPORTS || '1000000');
    const maxEntryFee = BigInt(process.env.ESPORTS_MAX_ENTRY_FEE_LAMPORTS || '100000000000');

    if (BigInt(entryFee) < minEntryFee || BigInt(entryFee) > maxEntryFee) {
      throw new BadRequestException(
        `Entry fee must be between ${minEntryFee} and ${maxEntryFee} lamports`,
      );
    }

    // Generate match ID
    const matchId = `match_${randomBytes(8).toString('hex')}`;

    // Create escrow account for the match
    const escrow = await this.escrowService.createEscrow({
      sourceType: EscrowSourceType.MATCH,
      sourceId: matchId,
      platformFeePercent,
    });

    // Create match
    const match = this.matchRepository.create({
      matchId,
      gameType,
      entryFee,
      minPlayers,
      maxPlayers,
      prizePool: '0',
      platformFeePercent,
      status: MatchStatus.CREATED,
      escrowAddress: escrow.escrowAddress,
      metadata,
      scheduledAt,
      participants: [],
    });

    const savedMatch = await this.matchRepository.save(match);

    this.logger.log(`Created match ${matchId}: ${gameType}, entry fee ${entryFee}`);

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
   */
  async submitResult(request: SubmitResultRequest): Promise<Match> {
    const { matchId, winnerIds, scores, proof, submittedBy } = request;

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

    // Update match result
    match.result = {
      winnerIds,
      scores,
      proof,
      submittedBy,
      verifiedAt: new Date(),
    };
    match.status = MatchStatus.COMPLETED;
    match.endedAt = new Date();
    match.winnerId = winnerIds[0]; // Primary winner

    await this.matchRepository.save(match);

    // Update participant placements
    for (let i = 0; i < winnerIds.length; i++) {
      const winnerId = winnerIds[i];
      await this.participantRepository.update(
        { matchId: match.id, playerId: winnerId },
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
   */
  async getMatches(options: MatchQueryOptions = {}): Promise<Match[]> {
    const { status, gameType, minEntryFee, maxEntryFee, limit = 20, offset = 0 } = options;

    const query = this.matchRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.participants', 'participants');

    if (status) {
      query.andWhere('match.status = :status', { status });
    }

    if (gameType) {
      query.andWhere('match.gameType = :gameType', { gameType });
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
