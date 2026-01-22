import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PrizeDistribution,
  PrizeDistributionStatus,
  PrizeSourceType,
  PrizeDistributionStrategy,
  PrizeRiskLevel,
} from '../entities/prize-distribution.entity';
import { Match, MatchParticipant } from '../entities/match.entity';
import { Tournament, TournamentRegistration } from '../entities/tournament.entity';
import { EscrowService } from './escrow.service';
import { PlayerWalletService } from './player-wallet.service';
import { EscrowSourceType } from '../entities/escrow.entity';

export interface DistributePrizesRequest {
  sourceType: PrizeSourceType;
  sourceId: string;
  recipients: {
    playerId: string;
    placement: number;
    amount?: string; // Override calculated amount
  }[];
}

export interface PrizeCalculation {
  walletId: string;
  playerId: string;
  placement: number;
  amount: string;
  percentage: number;
  label?: string;
  isMvp?: boolean;
}

/**
 * # Prize Strategy Configurations
 *
 * Default prize structures for each distribution strategy.
 */
export const PRIZE_STRATEGY_CONFIG: Record<
  PrizeDistributionStrategy,
  {
    riskLevel: PrizeRiskLevel;
    structure: { place: number; percentage: number; label: string; isMvp?: boolean }[];
  }
> = {
  [PrizeDistributionStrategy.WINNER_TAKES_ALL]: {
    riskLevel: PrizeRiskLevel.HIGH,
    structure: [{ place: 1, percentage: 100, label: '1st Place' }],
  },
  [PrizeDistributionStrategy.TOP_3_SPLIT]: {
    riskLevel: PrizeRiskLevel.MEDIUM,
    structure: [
      { place: 1, percentage: 60, label: '1st Place' },
      { place: 2, percentage: 30, label: '2nd Place' },
      { place: 3, percentage: 10, label: '3rd Place' },
    ],
  },
  [PrizeDistributionStrategy.PERFORMANCE_MVP]: {
    riskLevel: PrizeRiskLevel.LOW,
    structure: [
      { place: 1, percentage: 70, label: '1st Place' },
      { place: 2, percentage: 20, label: '2nd Place' },
      { place: 0, percentage: 10, label: 'MVP Bonus', isMvp: true },
    ],
  },
  [PrizeDistributionStrategy.CUSTOM]: {
    riskLevel: PrizeRiskLevel.MEDIUM,
    structure: [], // Custom structure provided by user
  },
};

@Injectable()
export class PrizeDistributionService {
  private readonly logger = new Logger(PrizeDistributionService.name);

  constructor(
    @InjectRepository(PrizeDistribution)
    private prizeRepository: Repository<PrizeDistribution>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    @InjectRepository(MatchParticipant)
    private participantRepository: Repository<MatchParticipant>,
    @InjectRepository(Tournament)
    private tournamentRepository: Repository<Tournament>,
    @InjectRepository(TournamentRegistration)
    private registrationRepository: Repository<TournamentRegistration>,
    private readonly escrowService: EscrowService,
    private readonly playerWalletService: PlayerWalletService,
  ) {}

  /**
   * Distribute prizes for a completed match
   *
   * Calculates and distributes prizes based on the match's prize strategy:
   * - WINNER_TAKES_ALL: 100% to winner
   * - TOP_3_SPLIT: 60%/30%/10% to top 3
   * - PERFORMANCE_MVP: 70%/20%/10% (winner/2nd/MVP)
   * - CUSTOM: User-defined structure
   */
  async distributeMatchPrizes(
    match: Match,
    participants: MatchParticipant[],
  ): Promise<PrizeDistribution> {
    const escrow = await this.escrowService.getEscrowBySource(
      EscrowSourceType.MATCH,
      match.matchId,
    );
    const escrowBalance = await this.escrowService.getEscrowBalance(escrow.escrowId);

    const totalPrizePool = BigInt(escrowBalance.currentBalance);
    const platformFee =
      (totalPrizePool * BigInt(Math.round(match.platformFeePercent * 100))) / BigInt(10000);
    const distributableAmount = totalPrizePool - platformFee;

    // Calculate distributions based on prize strategy
    const distributions = this.calculateMatchDistributionsByStrategy(
      match,
      participants,
      distributableAmount,
    );

    // Create prize distribution record
    const prizeDistribution = this.prizeRepository.create({
      sourceType: PrizeSourceType.MATCH,
      sourceId: match.matchId,
      totalPrizePool: totalPrizePool.toString(),
      platformFee: platformFee.toString(),
      distributableAmount: distributableAmount.toString(),
      distributedAmount: '0',
      status: PrizeDistributionStatus.PROCESSING,
      strategy: match.prizeStrategy,
      riskLevel: match.riskLevel,
      distributions: distributions.map((d) => ({
        ...d,
        status: 'pending' as const,
      })),
    });

    await this.prizeRepository.save(prizeDistribution);

    try {
      // Release escrow with distributions
      const escrowDistributions = distributions.map((d) => ({
        walletId: d.walletId,
        amount: d.amount,
        placement: d.placement,
      }));

      await this.escrowService.releaseEscrow({
        escrowId: escrow.escrowId,
        distributions: escrowDistributions,
      });

      // Credit prizes to player wallets
      let totalDistributed = BigInt(0);

      for (const dist of distributions) {
        try {
          await this.playerWalletService.creditPrize(dist.playerId, dist.amount, match.matchId);

          // Update distribution status
          const distEntry = prizeDistribution.distributions.find(
            (d) => d.playerId === dist.playerId,
          );
          if (distEntry) {
            distEntry.status = 'completed';
            distEntry.processedAt = new Date();
          }

          // Update participant prize won
          await this.participantRepository.update(
            { matchId: match.id, playerId: dist.playerId },
            { prizeWon: dist.amount },
          );

          totalDistributed += BigInt(dist.amount);
        } catch (error) {
          this.logger.error(`Failed to credit prize to ${dist.playerId}`, error);
          const distEntry = prizeDistribution.distributions.find(
            (d) => d.playerId === dist.playerId,
          );
          if (distEntry) {
            distEntry.status = 'failed';
            distEntry.failureReason = error.message;
          }
        }
      }

      prizeDistribution.distributedAmount = totalDistributed.toString();
      prizeDistribution.status = prizeDistribution.isFullyDistributed()
        ? PrizeDistributionStatus.COMPLETED
        : PrizeDistributionStatus.PARTIAL;
      prizeDistribution.distributedAt = new Date();

      await this.prizeRepository.save(prizeDistribution);

      this.logger.log(
        `Distributed prizes for match ${match.matchId}: ${totalDistributed} lamports to ${distributions.length} recipients`,
      );

      return prizeDistribution;
    } catch (error) {
      prizeDistribution.status = PrizeDistributionStatus.FAILED;
      prizeDistribution.metadata = {
        ...prizeDistribution.metadata,
        lastError: error.message,
      };
      await this.prizeRepository.save(prizeDistribution);
      throw error;
    }
  }

  /**
   * Distribute prizes for a completed tournament
   *
   * Calculates and distributes prizes based on the tournament's prize strategy.
   */
  async distributeTournamentPrizes(
    tournament: Tournament,
    registrations: TournamentRegistration[],
  ): Promise<PrizeDistribution> {
    const escrow = await this.escrowService.getEscrowBySource(
      EscrowSourceType.TOURNAMENT,
      tournament.tournamentId,
    );
    const escrowBalance = await this.escrowService.getEscrowBalance(escrow.escrowId);

    const totalPrizePool = BigInt(escrowBalance.currentBalance);
    const platformFee =
      (totalPrizePool * BigInt(Math.round(tournament.platformFeePercent * 100))) / BigInt(10000);
    const distributableAmount = totalPrizePool - platformFee;

    // Calculate distributions based on prize structure and strategy
    const distributions = this.calculateTournamentDistributionsByStrategy(
      tournament,
      registrations,
      distributableAmount,
    );

    // Create prize distribution record
    const prizeDistribution = this.prizeRepository.create({
      sourceType: PrizeSourceType.TOURNAMENT,
      sourceId: tournament.tournamentId,
      totalPrizePool: totalPrizePool.toString(),
      platformFee: platformFee.toString(),
      distributableAmount: distributableAmount.toString(),
      distributedAmount: '0',
      status: PrizeDistributionStatus.PROCESSING,
      strategy: tournament.prizeStrategy,
      riskLevel: tournament.riskLevel,
      distributions: distributions.map((d) => ({
        ...d,
        status: 'pending' as const,
      })),
    });

    await this.prizeRepository.save(prizeDistribution);

    try {
      // Release escrow
      const escrowDistributions = distributions.map((d) => ({
        walletId: d.walletId,
        amount: d.amount,
        placement: d.placement,
      }));

      await this.escrowService.releaseEscrow({
        escrowId: escrow.escrowId,
        distributions: escrowDistributions,
      });

      // Credit prizes to player wallets
      let totalDistributed = BigInt(0);

      for (const dist of distributions) {
        try {
          await this.playerWalletService.creditPrize(
            dist.playerId,
            dist.amount,
            tournament.tournamentId,
          );

          const distEntry = prizeDistribution.distributions.find(
            (d) => d.playerId === dist.playerId,
          );
          if (distEntry) {
            distEntry.status = 'completed';
            distEntry.processedAt = new Date();
          }

          // Update registration prize won
          await this.registrationRepository.update(
            { tournamentId: tournament.id, playerId: dist.playerId },
            { prizeWon: dist.amount, finalPlacement: dist.placement },
          );

          totalDistributed += BigInt(dist.amount);
        } catch (error) {
          this.logger.error(`Failed to credit prize to ${dist.playerId}`, error);
          const distEntry = prizeDistribution.distributions.find(
            (d) => d.playerId === dist.playerId,
          );
          if (distEntry) {
            distEntry.status = 'failed';
            distEntry.failureReason = error.message;
          }
        }
      }

      prizeDistribution.distributedAmount = totalDistributed.toString();
      prizeDistribution.status = prizeDistribution.isFullyDistributed()
        ? PrizeDistributionStatus.COMPLETED
        : PrizeDistributionStatus.PARTIAL;
      prizeDistribution.distributedAt = new Date();

      await this.prizeRepository.save(prizeDistribution);

      this.logger.log(
        `Distributed prizes for tournament ${tournament.tournamentId}: ${totalDistributed} lamports`,
      );

      return prizeDistribution;
    } catch (error) {
      prizeDistribution.status = PrizeDistributionStatus.FAILED;
      prizeDistribution.metadata = {
        ...prizeDistribution.metadata,
        lastError: error.message,
      };
      await this.prizeRepository.save(prizeDistribution);
      throw error;
    }
  }

  /**
   * Get prize info for a match or tournament
   *
   * Returns prize pool breakdown based on distribution strategy.
   */
  async getPrizeInfo(
    sourceType: PrizeSourceType,
    sourceId: string,
  ): Promise<{
    totalPrizePool: string;
    platformFee: string;
    distributableAmount: string;
    strategy: PrizeDistributionStrategy;
    riskLevel: PrizeRiskLevel;
    prizeBreakdown: {
      placement: number;
      percentage: number;
      amount: string;
      label?: string;
      isMvp?: boolean;
    }[];
  }> {
    let totalPrizePool: bigint;
    let platformFeePercent: number;
    let prizeStructure: { place: number; percentage: number; label?: string; isMvp?: boolean }[];
    let strategy: PrizeDistributionStrategy;
    let riskLevel: PrizeRiskLevel;

    if (sourceType === PrizeSourceType.MATCH) {
      const match = await this.matchRepository.findOne({
        where: { matchId: sourceId },
      });
      if (!match) {
        throw new NotFoundException(`Match ${sourceId} not found`);
      }
      totalPrizePool = BigInt(match.prizePool);
      platformFeePercent = match.platformFeePercent;
      strategy = match.prizeStrategy || PrizeDistributionStrategy.WINNER_TAKES_ALL;
      riskLevel = match.riskLevel || PrizeRiskLevel.HIGH;

      // Get prize structure from match or strategy config
      prizeStructure = match.prizeStructure || PRIZE_STRATEGY_CONFIG[strategy].structure;
    } else {
      const tournament = await this.tournamentRepository.findOne({
        where: { tournamentId: sourceId },
      });
      if (!tournament) {
        throw new NotFoundException(`Tournament ${sourceId} not found`);
      }
      totalPrizePool = BigInt(tournament.prizePool);
      platformFeePercent = tournament.platformFeePercent;
      strategy = tournament.prizeStrategy || PrizeDistributionStrategy.TOP_3_SPLIT;
      riskLevel = tournament.riskLevel || PrizeRiskLevel.MEDIUM;
      prizeStructure = tournament.prizeStructure;
    }

    const platformFee =
      (totalPrizePool * BigInt(Math.round(platformFeePercent * 100))) / BigInt(10000);
    const distributableAmount = totalPrizePool - platformFee;

    const prizeBreakdown = prizeStructure.map((ps) => ({
      placement: ps.place,
      percentage: ps.percentage,
      amount: ((distributableAmount * BigInt(ps.percentage)) / BigInt(100)).toString(),
      label: ps.label,
      isMvp: ps.isMvp,
    }));

    return {
      totalPrizePool: totalPrizePool.toString(),
      platformFee: platformFee.toString(),
      distributableAmount: distributableAmount.toString(),
      strategy,
      riskLevel,
      prizeBreakdown,
    };
  }

  /**
   * Get prize distribution history
   */
  async getPrizeHistory(options?: {
    sourceType?: PrizeSourceType;
    playerId?: string;
    status?: PrizeDistributionStatus;
    limit?: number;
    offset?: number;
  }): Promise<PrizeDistribution[]> {
    const query = this.prizeRepository.createQueryBuilder('prize');

    if (options?.sourceType) {
      query.andWhere('prize.sourceType = :sourceType', { sourceType: options.sourceType });
    }

    if (options?.playerId) {
      query.andWhere('prize.distributions::jsonb @> :playerFilter', {
        playerFilter: JSON.stringify([{ playerId: options.playerId }]),
      });
    }

    if (options?.status) {
      query.andWhere('prize.status = :status', { status: options.status });
    }

    query.orderBy('prize.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.getMany();
  }

  /**
   * Get prize distribution by source
   */
  async getPrizeDistribution(
    sourceType: PrizeSourceType,
    sourceId: string,
  ): Promise<PrizeDistribution | null> {
    return this.prizeRepository.findOne({
      where: { sourceType, sourceId },
    });
  }

  // Private calculation methods

  /**
   * Calculate match distributions based on prize strategy
   *
   * @param match - Match entity with strategy and results
   * @param participants - All match participants
   * @param distributableAmount - Amount after platform fee
   * @returns Array of prize calculations for each recipient
   */
  private calculateMatchDistributionsByStrategy(
    match: Match,
    participants: MatchParticipant[],
    distributableAmount: bigint,
  ): PrizeCalculation[] {
    const distributions: PrizeCalculation[] = [];
    const strategy = match.prizeStrategy || PrizeDistributionStrategy.WINNER_TAKES_ALL;

    // Get prize structure from match or default config
    const prizeStructure =
      match.prizeStructure && match.prizeStructure.length > 0
        ? match.prizeStructure
        : PRIZE_STRATEGY_CONFIG[strategy].structure;

    if (!match.result?.winnerIds?.length) {
      return distributions;
    }

    // Sort participants by placement (based on scores or winner position)
    const rankedParticipants = this.rankParticipantsByResult(match, participants);

    // Process each prize structure entry
    for (const prizeEntry of prizeStructure) {
      let recipient: MatchParticipant | undefined;

      if (prizeEntry.isMvp) {
        // MVP bonus - use mvpPlayerId from result
        if (match.result.mvpPlayerId) {
          recipient = participants.find((p) => p.playerId === match.result.mvpPlayerId);
        }
      } else {
        // Standard placement prize
        recipient = rankedParticipants.find((p) => {
          const placement = rankedParticipants.indexOf(p) + 1;
          return placement === prizeEntry.place;
        });
      }

      if (recipient) {
        const amount = (distributableAmount * BigInt(prizeEntry.percentage)) / BigInt(100);
        distributions.push({
          walletId: recipient.walletId,
          playerId: recipient.playerId,
          placement: prizeEntry.isMvp ? 0 : prizeEntry.place,
          amount: amount.toString(),
          percentage: prizeEntry.percentage,
          label: prizeEntry.label,
          isMvp: prizeEntry.isMvp,
        });
      }
    }

    return distributions;
  }

  /**
   * Rank participants by match result
   */
  private rankParticipantsByResult(
    match: Match,
    participants: MatchParticipant[],
  ): MatchParticipant[] {
    if (!match.result?.winnerIds?.length) {
      return [];
    }

    // If we have scores, sort by score descending
    if (match.result.scores) {
      return [...participants].sort((a, b) => {
        const scoreA = match.result.scores?.[a.playerId] ?? 0;
        const scoreB = match.result.scores?.[b.playerId] ?? 0;
        return scoreB - scoreA;
      });
    }

    // Otherwise, winners first, then others
    const winners = participants.filter((p) => match.result.winnerIds?.includes(p.playerId));
    const others = participants.filter((p) => !match.result.winnerIds?.includes(p.playerId));
    return [...winners, ...others];
  }

  /**
   * Calculate tournament distributions based on prize strategy
   */
  private calculateTournamentDistributionsByStrategy(
    tournament: Tournament,
    registrations: TournamentRegistration[],
    distributableAmount: bigint,
  ): PrizeCalculation[] {
    const distributions: PrizeCalculation[] = [];

    // Sort registrations by final placement
    const rankedRegistrations = registrations
      .filter((r) => r.finalPlacement !== null && r.finalPlacement !== undefined)
      .sort((a, b) => (a.finalPlacement || 0) - (b.finalPlacement || 0));

    for (const prizeEntry of tournament.prizeStructure) {
      if (prizeEntry.isMvp) {
        // MVP bonus - would need to be set separately (e.g., via metadata)
        // For now, skip MVP entries in tournaments unless explicitly handled
        continue;
      }

      const registration = rankedRegistrations.find((r) => r.finalPlacement === prizeEntry.place);

      if (registration) {
        const amount = prizeEntry.fixedAmount
          ? BigInt(prizeEntry.fixedAmount)
          : (distributableAmount * BigInt(prizeEntry.percentage)) / BigInt(100);

        distributions.push({
          walletId: registration.walletId,
          playerId: registration.playerId,
          placement: prizeEntry.place,
          amount: amount.toString(),
          percentage: prizeEntry.percentage,
          label: prizeEntry.label,
          isMvp: prizeEntry.isMvp,
        });
      }
    }

    return distributions;
  }

  // Legacy methods maintained for backward compatibility

  private calculateMatchDistributions(
    match: Match,
    participants: MatchParticipant[],
    distributableAmount: bigint,
  ): PrizeCalculation[] {
    // Delegate to new strategy-based method
    return this.calculateMatchDistributionsByStrategy(match, participants, distributableAmount);
  }

  private calculateTournamentDistributions(
    tournament: Tournament,
    registrations: TournamentRegistration[],
    distributableAmount: bigint,
  ): PrizeCalculation[] {
    // Delegate to new strategy-based method
    return this.calculateTournamentDistributionsByStrategy(
      tournament,
      registrations,
      distributableAmount,
    );
  }
}
