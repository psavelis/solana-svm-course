import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PrizeDistribution,
  PrizeDistributionStatus,
  PrizeSourceType,
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
}

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

    // Calculate distributions based on match type
    const distributions = this.calculateMatchDistributions(
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

    // Calculate distributions based on prize structure
    const distributions = this.calculateTournamentDistributions(
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
   */
  async getPrizeInfo(
    sourceType: PrizeSourceType,
    sourceId: string,
  ): Promise<{
    totalPrizePool: string;
    platformFee: string;
    distributableAmount: string;
    prizeBreakdown: { placement: number; percentage: number; amount: string }[];
  }> {
    let totalPrizePool: bigint;
    let platformFeePercent: number;
    let prizeStructure: { place: number; percentage: number }[];

    if (sourceType === PrizeSourceType.MATCH) {
      const match = await this.matchRepository.findOne({
        where: { matchId: sourceId },
      });
      if (!match) {
        throw new NotFoundException(`Match ${sourceId} not found`);
      }
      totalPrizePool = BigInt(match.prizePool);
      platformFeePercent = match.platformFeePercent;
      // Default match prize structure: winner takes all
      prizeStructure = [{ place: 1, percentage: 100 }];
    } else {
      const tournament = await this.tournamentRepository.findOne({
        where: { tournamentId: sourceId },
      });
      if (!tournament) {
        throw new NotFoundException(`Tournament ${sourceId} not found`);
      }
      totalPrizePool = BigInt(tournament.prizePool);
      platformFeePercent = tournament.platformFeePercent;
      prizeStructure = tournament.prizeStructure;
    }

    const platformFee =
      (totalPrizePool * BigInt(Math.round(platformFeePercent * 100))) / BigInt(10000);
    const distributableAmount = totalPrizePool - platformFee;

    const prizeBreakdown = prizeStructure.map((ps) => ({
      placement: ps.place,
      percentage: ps.percentage,
      amount: ((distributableAmount * BigInt(ps.percentage)) / BigInt(100)).toString(),
    }));

    return {
      totalPrizePool: totalPrizePool.toString(),
      platformFee: platformFee.toString(),
      distributableAmount: distributableAmount.toString(),
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

  private calculateMatchDistributions(
    match: Match,
    participants: MatchParticipant[],
    distributableAmount: bigint,
  ): PrizeCalculation[] {
    const distributions: PrizeCalculation[] = [];

    // For duel matches, winner takes all
    if (match.gameType === 'duel' && match.result?.winnerIds?.length === 1) {
      const winnerId = match.result.winnerIds[0];
      const winner = participants.find((p) => p.playerId === winnerId);

      if (winner) {
        distributions.push({
          walletId: winner.walletId,
          playerId: winner.playerId,
          placement: 1,
          amount: distributableAmount.toString(),
          percentage: 100,
        });
      }
    } else if (match.result?.winnerIds) {
      // Split among winners for team or multi-winner matches
      const winnerCount = match.result.winnerIds.length;
      const prizePerWinner = distributableAmount / BigInt(winnerCount);

      for (let i = 0; i < match.result.winnerIds.length; i++) {
        const winnerId = match.result.winnerIds[i];
        const winner = participants.find((p) => p.playerId === winnerId);

        if (winner) {
          distributions.push({
            walletId: winner.walletId,
            playerId: winner.playerId,
            placement: i + 1,
            amount: prizePerWinner.toString(),
            percentage: 100 / winnerCount,
          });
        }
      }
    }

    return distributions;
  }

  private calculateTournamentDistributions(
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
        });
      }
    }

    return distributions;
  }
}
