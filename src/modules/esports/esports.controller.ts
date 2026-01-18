import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';

import { MatchmakingService } from './services/matchmaking.service';
import { PlayerWalletService } from './services/player-wallet.service';
import { TournamentService } from './services/tournament.service';
import { PrizeDistributionService } from './services/prize-distribution.service';

import {
  CreateMatchDto,
  JoinMatchDto,
  SubmitResultDto,
  MatchQueryDto,
  MatchResponseDto,
  MatchParticipantResponseDto,
} from './dto/match.dto';

import {
  CreateTournamentDto,
  RegisterPlayerDto,
  AdvanceRoundDto,
  TournamentQueryDto,
  TournamentResponseDto,
  TournamentRegistrationResponseDto,
  BracketResponseDto,
} from './dto/tournament.dto';

import {
  CreatePlayerWalletDto,
  DepositDto,
  WithdrawDto,
  TransactionQueryDto,
  PlayerWalletResponseDto,
  WalletBalanceResponseDto,
  WalletTransactionResponseDto,
  WithdrawalResponseDto,
} from './dto/player-wallet.dto';

import {
  DistributePrizesDto,
  PrizeHistoryQueryDto,
  PrizeDistributionResponseDto,
  PrizeInfoResponseDto,
} from './dto/prize.dto';

import { GameType, MatchStatus } from './entities/match.entity';
import { TournamentStatus, BracketType } from './entities/tournament.entity';
import { PrizeSourceType } from './entities/prize-distribution.entity';

/**
 * # Esports Controller
 *
 * REST API for monetized competitive gaming on Solana.
 *
 * ## Core Features
 *
 * - **Monetized Matchmaking**: Entry fee collection and escrow management
 * - **MPC Wallets**: Secure 2-of-3 threshold signature wallets for players
 * - **Prize Distribution**: Automated prize payouts with platform fee handling
 * - **Tournament Management**: Bracket generation and round advancement
 *
 * ## Security Model
 *
 * | Component | Protection |
 * |-----------|------------|
 * | Player Wallets | MPC 2-of-3 threshold signing |
 * | Entry Fees | Escrow-locked until match completion |
 * | Withdrawals | Rate limiting + cooldown periods |
 * | Prize Distribution | Atomic multi-recipient transfers |
 *
 * @see [docs/diagrams/16-esports-matchmaking.md](docs/diagrams/16-esports-matchmaking.md) - Architecture
 * @see [docs/diagrams/08-mpc.md](docs/diagrams/08-mpc.md) - MPC Implementation
 */
@ApiTags('Esports')
@Controller('esports')
export class EsportsController {
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly playerWalletService: PlayerWalletService,
    private readonly tournamentService: TournamentService,
    private readonly prizeDistributionService: PrizeDistributionService,
  ) {}

  // ==================== MATCHES ====================

  /**
   * Create a new monetized match
   *
   * Creates a match with entry fee requirements and initializes
   * an escrow account to hold player funds until match completion.
   */
  @Post('matches')
  @ApiOperation({
    summary: 'Create monetized match',
    description: 'Create a new match with entry fee and escrow',
  })
  @ApiBody({ type: CreateMatchDto })
  @ApiResponse({ status: 201, type: MatchResponseDto })
  async createMatch(@Body() dto: CreateMatchDto): Promise<MatchResponseDto> {
    const match = await this.matchmakingService.createMatch({
      gameType: dto.gameType,
      entryFee: dto.entryFee,
      minPlayers: dto.minPlayers,
      maxPlayers: dto.maxPlayers,
      platformFeePercent: dto.platformFeePercent,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      metadata: dto.metadata,
    });

    return this.mapMatchToResponse(match);
  }

  /**
   * Join a match with entry fee payment
   *
   * Locks the entry fee from player's wallet and deposits to match escrow.
   * Player must have sufficient available balance in their MPC wallet.
   */
  @Post('matches/:matchId/join')
  @ApiOperation({
    summary: 'Join match with entry fee',
    description: 'Join match and pay entry fee from player wallet',
  })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiBody({ type: JoinMatchDto })
  @ApiResponse({ status: 200, type: MatchParticipantResponseDto })
  async joinMatch(
    @Param('matchId') matchId: string,
    @Body() dto: JoinMatchDto,
  ): Promise<MatchParticipantResponseDto> {
    const participant = await this.matchmakingService.joinMatch({
      matchId,
      playerId: dto.playerId,
      teamId: dto.teamId,
      displayName: dto.displayName,
    });

    return {
      id: participant.id,
      playerId: participant.playerId,
      status: participant.status,
      placement: participant.placement,
      prizeWon: participant.prizeWon,
      joinedAt: participant.joinedAt,
    };
  }

  /**
   * Start a match
   *
   * Locks the escrow to prevent withdrawals and transitions
   * all participants to playing status.
   */
  @Post('matches/:matchId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start match',
    description: 'Lock escrow and start the match',
  })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiResponse({ status: 200, type: MatchResponseDto })
  async startMatch(@Param('matchId') matchId: string): Promise<MatchResponseDto> {
    const match = await this.matchmakingService.startMatch(matchId);
    return this.mapMatchToResponse(match);
  }

  /**
   * Submit match result
   *
   * Records the match outcome, triggers prize calculation,
   * and initiates automated prize distribution to winners.
   */
  @Post('matches/:matchId/result')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit match result',
    description: 'Record result and trigger prize distribution',
  })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiBody({ type: SubmitResultDto })
  @ApiResponse({ status: 200, type: MatchResponseDto })
  async submitResult(
    @Param('matchId') matchId: string,
    @Body() dto: SubmitResultDto,
  ): Promise<MatchResponseDto> {
    const match = await this.matchmakingService.submitResult({
      matchId,
      winnerIds: dto.winnerIds,
      scores: dto.scores,
      proof: dto.proof,
      submittedBy: dto.submittedBy,
    });

    return this.mapMatchToResponse(match);
  }

  /**
   * Cancel a match
   *
   * Refunds all participants' entry fees from escrow back to their wallets.
   */
  @Delete('matches/:matchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel match',
    description: 'Cancel match and refund all participants',
  })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiResponse({ status: 200, type: MatchResponseDto })
  async cancelMatch(@Param('matchId') matchId: string): Promise<MatchResponseDto> {
    const match = await this.matchmakingService.cancelMatch(matchId);
    return this.mapMatchToResponse(match);
  }

  /**
   * Get match details
   */
  @Get('matches/:matchId')
  @ApiOperation({ summary: 'Get match details' })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiResponse({ status: 200, type: MatchResponseDto })
  async getMatch(@Param('matchId') matchId: string): Promise<MatchResponseDto> {
    const match = await this.matchmakingService.getMatch(matchId);
    return this.mapMatchToResponse(match);
  }

  /**
   * List matches with filters
   */
  @Get('matches')
  @ApiOperation({ summary: 'List matches' })
  @ApiResponse({ status: 200, type: [MatchResponseDto] })
  async getMatches(@Query() query: MatchQueryDto): Promise<MatchResponseDto[]> {
    const matches = await this.matchmakingService.getMatches({
      status: query.status,
      gameType: query.gameType,
      minEntryFee: query.minEntryFee,
      maxEntryFee: query.maxEntryFee,
      limit: query.limit,
      offset: query.offset,
    });

    return matches.map((m) => this.mapMatchToResponse(m));
  }

  /**
   * Get match participants
   */
  @Get('matches/:matchId/participants')
  @ApiOperation({ summary: 'Get match participants' })
  @ApiParam({ name: 'matchId', description: 'Match identifier' })
  @ApiResponse({ status: 200, type: [MatchParticipantResponseDto] })
  async getMatchParticipants(
    @Param('matchId') matchId: string,
  ): Promise<MatchParticipantResponseDto[]> {
    const participants = await this.matchmakingService.getMatchParticipants(matchId);

    return participants.map((p) => ({
      id: p.id,
      playerId: p.playerId,
      status: p.status,
      placement: p.placement,
      prizeWon: p.prizeWon,
      joinedAt: p.joinedAt,
    }));
  }

  // ==================== PLAYER WALLETS ====================

  /**
   * Create MPC-secured player wallet
   *
   * Creates a 2-of-3 threshold signature wallet:
   * - Share 1: Player (mobile/hardware key)
   * - Share 2: Platform (server-side)
   * - Share 3: Recovery (cold storage)
   */
  @Post('wallets')
  @ApiOperation({
    summary: 'Create MPC player wallet',
    description: 'Create 2-of-3 threshold signature wallet for player',
  })
  @ApiBody({ type: CreatePlayerWalletDto })
  @ApiResponse({ status: 201, type: PlayerWalletResponseDto })
  async createPlayerWallet(@Body() dto: CreatePlayerWalletDto): Promise<PlayerWalletResponseDto> {
    const wallet = await this.playerWalletService.createWallet({
      playerId: dto.playerId,
      metadata: dto.metadata,
    });

    return this.mapWalletToResponse(wallet);
  }

  /**
   * Get player wallet
   */
  @Get('wallets/:playerId')
  @ApiOperation({ summary: 'Get player wallet' })
  @ApiParam({ name: 'playerId', description: 'Player identifier' })
  @ApiResponse({ status: 200, type: PlayerWalletResponseDto })
  async getPlayerWallet(@Param('playerId') playerId: string): Promise<PlayerWalletResponseDto> {
    const wallet = await this.playerWalletService.getWallet(playerId);
    return this.mapWalletToResponse(wallet);
  }

  /**
   * Get wallet balance
   */
  @Get('wallets/:playerId/balance')
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiParam({ name: 'playerId', description: 'Player identifier' })
  @ApiResponse({ status: 200, type: WalletBalanceResponseDto })
  async getWalletBalance(@Param('playerId') playerId: string): Promise<WalletBalanceResponseDto> {
    const balance = await this.playerWalletService.getBalance(playerId);

    return {
      playerId,
      availableBalance: balance.availableBalance,
      lockedBalance: balance.lockedBalance,
      totalBalance: balance.totalBalance,
      currency: 'SOL',
    };
  }

  /**
   * Record deposit to wallet
   *
   * Records an external deposit to the player's wallet.
   * Caller must provide the Solana transaction signature.
   */
  @Post('wallets/:playerId/deposit')
  @ApiOperation({
    summary: 'Record deposit',
    description: 'Record external deposit to player wallet',
  })
  @ApiParam({ name: 'playerId', description: 'Player identifier' })
  @ApiBody({ type: DepositDto })
  @ApiResponse({ status: 200, type: WalletTransactionResponseDto })
  async deposit(
    @Param('playerId') playerId: string,
    @Body() dto: DepositDto,
  ): Promise<WalletTransactionResponseDto> {
    const tx = await this.playerWalletService.deposit({
      playerId,
      amount: dto.amount,
      signature: dto.signature,
      fromAddress: dto.fromAddress,
    });

    return {
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      signature: tx.signature,
      reference: tx.reference,
      status: tx.status,
      failureReason: tx.failureReason,
      createdAt: tx.createdAt,
    };
  }

  /**
   * Withdraw from wallet
   *
   * Initiates MPC-signed withdrawal requiring threshold signatures.
   * Subject to daily limits and cooldown periods.
   */
  @Post('wallets/:playerId/withdraw')
  @ApiOperation({
    summary: 'Withdraw funds',
    description: 'MPC-signed withdrawal with rate limiting',
  })
  @ApiParam({ name: 'playerId', description: 'Player identifier' })
  @ApiBody({ type: WithdrawDto })
  @ApiResponse({ status: 200, type: WithdrawalResponseDto })
  async withdraw(
    @Param('playerId') playerId: string,
    @Body() dto: WithdrawDto,
  ): Promise<WithdrawalResponseDto> {
    const tx = await this.playerWalletService.withdraw({
      playerId,
      amount: dto.amount,
      destinationAddress: dto.destinationAddress,
    });

    return {
      transactionId: tx.id,
      amount: tx.amount,
      destinationAddress: dto.destinationAddress,
      signature: tx.signature,
      status: tx.status,
      estimatedCompletionTime: new Date(Date.now() + 60000), // ~1 min
    };
  }

  /**
   * Get wallet transaction history
   */
  @Get('wallets/:playerId/transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiParam({ name: 'playerId', description: 'Player identifier' })
  @ApiResponse({ status: 200, type: [WalletTransactionResponseDto] })
  async getTransactions(
    @Param('playerId') playerId: string,
    @Query() query: TransactionQueryDto,
  ): Promise<WalletTransactionResponseDto[]> {
    const transactions = await this.playerWalletService.getTransactions(playerId, {
      type: query.type,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      signature: tx.signature,
      reference: tx.reference,
      status: tx.status,
      failureReason: tx.failureReason,
      createdAt: tx.createdAt,
    }));
  }

  // ==================== TOURNAMENTS ====================

  /**
   * Create tournament
   */
  @Post('tournaments')
  @ApiOperation({
    summary: 'Create tournament',
    description: 'Create tournament with prize structure',
  })
  @ApiBody({ type: CreateTournamentDto })
  @ApiResponse({ status: 201, type: TournamentResponseDto })
  async createTournament(@Body() dto: CreateTournamentDto): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.createTournament({
      name: dto.name,
      description: dto.description,
      gameType: dto.gameType,
      entryFee: dto.entryFee,
      guaranteedPrizePool: dto.guaranteedPrizePool,
      maxParticipants: dto.maxParticipants,
      minParticipants: dto.minParticipants,
      bracketType: dto.bracketType,
      platformFeePercent: dto.platformFeePercent,
      prizeStructure: dto.prizeStructure,
      registrationStart: new Date(dto.registrationStart),
      registrationEnd: new Date(dto.registrationEnd),
      startDate: new Date(dto.startDate),
      metadata: dto.metadata,
    });

    return this.mapTournamentToResponse(tournament);
  }

  /**
   * Register for tournament
   */
  @Post('tournaments/:tournamentId/register')
  @ApiOperation({
    summary: 'Register for tournament',
    description: 'Register player and pay entry fee',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament identifier' })
  @ApiBody({ type: RegisterPlayerDto })
  @ApiResponse({ status: 200, type: TournamentRegistrationResponseDto })
  async registerForTournament(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: RegisterPlayerDto,
  ): Promise<TournamentRegistrationResponseDto> {
    const registration = await this.tournamentService.registerPlayer({
      tournamentId,
      playerId: dto.playerId,
      teamName: dto.teamName,
      displayName: dto.displayName,
    });

    return {
      id: registration.id,
      playerId: registration.playerId,
      seed: registration.seed,
      status: registration.status,
      paymentSignature: registration.paymentSignature,
      finalPlacement: registration.finalPlacement,
      prizeWon: registration.prizeWon,
      registeredAt: registration.registeredAt,
    };
  }

  /**
   * Generate tournament bracket
   */
  @Post('tournaments/:tournamentId/bracket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate bracket',
    description: 'Generate seeded bracket and lock escrow',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament identifier' })
  @ApiResponse({ status: 200, type: BracketResponseDto })
  async generateBracket(@Param('tournamentId') tournamentId: string): Promise<BracketResponseDto> {
    const tournament = await this.tournamentService.generateBracket(tournamentId);

    return {
      tournamentId: tournament.tournamentId,
      bracketType: tournament.bracketType,
      totalRounds: tournament.bracket?.rounds?.length || 0,
      rounds: tournament.bracket?.rounds || [],
    };
  }

  /**
   * Advance tournament round
   */
  @Post('tournaments/:tournamentId/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Advance round',
    description: 'Submit round results and advance winners',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament identifier' })
  @ApiBody({ type: AdvanceRoundDto })
  @ApiResponse({ status: 200, type: TournamentResponseDto })
  async advanceRound(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: AdvanceRoundDto,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.advanceRound(tournamentId, dto.results);
    return this.mapTournamentToResponse(tournament);
  }

  /**
   * Get tournament
   */
  @Get('tournaments/:tournamentId')
  @ApiOperation({ summary: 'Get tournament details' })
  @ApiParam({ name: 'tournamentId', description: 'Tournament identifier' })
  @ApiResponse({ status: 200, type: TournamentResponseDto })
  async getTournament(@Param('tournamentId') tournamentId: string): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.getTournament(tournamentId);
    return this.mapTournamentToResponse(tournament);
  }

  /**
   * List tournaments
   */
  @Get('tournaments')
  @ApiOperation({ summary: 'List tournaments' })
  @ApiResponse({ status: 200, type: [TournamentResponseDto] })
  async getTournaments(@Query() query: TournamentQueryDto): Promise<TournamentResponseDto[]> {
    const tournaments = await this.tournamentService.getTournaments({
      status: query.status,
      gameType: query.gameType,
      limit: query.limit,
      offset: query.offset,
    });

    return tournaments.map((t) => this.mapTournamentToResponse(t));
  }

  /**
   * Cancel tournament
   */
  @Delete('tournaments/:tournamentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel tournament',
    description: 'Cancel and refund all registrations',
  })
  @ApiParam({ name: 'tournamentId', description: 'Tournament identifier' })
  @ApiResponse({ status: 200, type: TournamentResponseDto })
  async cancelTournament(
    @Param('tournamentId') tournamentId: string,
  ): Promise<TournamentResponseDto> {
    const tournament = await this.tournamentService.cancelTournament(tournamentId);
    return this.mapTournamentToResponse(tournament);
  }

  // ==================== PRIZES ====================

  /**
   * Get prize info
   */
  @Get('prizes/:sourceType/:sourceId')
  @ApiOperation({
    summary: 'Get prize information',
    description: 'Get prize pool breakdown for match or tournament',
  })
  @ApiParam({ name: 'sourceType', enum: PrizeSourceType })
  @ApiParam({ name: 'sourceId', description: 'Match or Tournament ID' })
  @ApiResponse({ status: 200, type: PrizeInfoResponseDto })
  async getPrizeInfo(
    @Param('sourceType') sourceType: PrizeSourceType,
    @Param('sourceId') sourceId: string,
  ): Promise<PrizeInfoResponseDto> {
    const prizeInfo = await this.prizeDistributionService.getPrizeInfo(sourceType, sourceId);

    return {
      sourceType,
      sourceId,
      ...prizeInfo,
    };
  }

  /**
   * Get prize distribution details
   */
  @Get('prizes/:sourceType/:sourceId/distribution')
  @ApiOperation({ summary: 'Get prize distribution details' })
  @ApiParam({ name: 'sourceType', enum: PrizeSourceType })
  @ApiParam({ name: 'sourceId', description: 'Match or Tournament ID' })
  @ApiResponse({ status: 200, type: PrizeDistributionResponseDto })
  async getPrizeDistribution(
    @Param('sourceType') sourceType: PrizeSourceType,
    @Param('sourceId') sourceId: string,
  ): Promise<PrizeDistributionResponseDto | null> {
    const distribution = await this.prizeDistributionService.getPrizeDistribution(
      sourceType,
      sourceId,
    );

    if (!distribution) {
      return null;
    }

    return {
      id: distribution.id,
      sourceType: distribution.sourceType,
      sourceId: distribution.sourceId,
      totalPrizePool: distribution.totalPrizePool,
      platformFee: distribution.platformFee,
      distributableAmount: distribution.distributableAmount,
      distributedAmount: distribution.distributedAmount,
      status: distribution.status,
      distributions: distribution.distributions,
      distributedAt: distribution.distributedAt,
      createdAt: distribution.createdAt,
    };
  }

  /**
   * Get prize history
   */
  @Get('prizes/history')
  @ApiOperation({ summary: 'Get prize distribution history' })
  @ApiResponse({ status: 200, type: [PrizeDistributionResponseDto] })
  async getPrizeHistory(
    @Query() query: PrizeHistoryQueryDto,
  ): Promise<PrizeDistributionResponseDto[]> {
    const distributions = await this.prizeDistributionService.getPrizeHistory({
      sourceType: query.sourceType,
      playerId: query.playerId,
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return distributions.map((d) => ({
      id: d.id,
      sourceType: d.sourceType,
      sourceId: d.sourceId,
      totalPrizePool: d.totalPrizePool,
      platformFee: d.platformFee,
      distributableAmount: d.distributableAmount,
      distributedAmount: d.distributedAmount,
      status: d.status,
      distributions: d.distributions,
      distributedAt: d.distributedAt,
      createdAt: d.createdAt,
    }));
  }

  // ==================== HELPERS ====================

  private mapMatchToResponse(match: any): MatchResponseDto {
    return {
      id: match.id,
      matchId: match.matchId,
      gameType: match.gameType,
      entryFee: match.entryFee,
      minPlayers: match.minPlayers,
      maxPlayers: match.maxPlayers,
      currentPlayers: match.getCurrentPlayerCount?.() || match.participants?.length || 0,
      prizePool: match.prizePool,
      platformFeePercent: match.platformFeePercent,
      status: match.status,
      winnerId: match.winnerId,
      escrowAddress: match.escrowAddress,
      metadata: match.metadata,
      scheduledAt: match.scheduledAt,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      createdAt: match.createdAt,
    };
  }

  private mapWalletToResponse(wallet: any): PlayerWalletResponseDto {
    return {
      id: wallet.id,
      playerId: wallet.playerId,
      publicKey: wallet.publicKey,
      availableBalance: wallet.availableBalance,
      lockedBalance: wallet.lockedBalance,
      totalBalance: wallet.getTotalBalance?.().toString() || '0',
      totalDeposited: wallet.totalDeposited,
      totalWithdrawn: wallet.totalWithdrawn,
      totalWinnings: wallet.totalWinnings,
      totalEntryFees: wallet.totalEntryFees,
      status: wallet.status,
      metadata: wallet.metadata,
      createdAt: wallet.createdAt,
    };
  }

  private mapTournamentToResponse(tournament: any): TournamentResponseDto {
    return {
      id: tournament.id,
      tournamentId: tournament.tournamentId,
      name: tournament.name,
      description: tournament.description,
      gameType: tournament.gameType,
      entryFee: tournament.entryFee,
      prizePool: tournament.prizePool,
      guaranteedPrizePool: tournament.guaranteedPrizePool,
      maxParticipants: tournament.maxParticipants,
      minParticipants: tournament.minParticipants,
      currentParticipants: tournament.getCurrentParticipantCount?.() || 0,
      bracketType: tournament.bracketType,
      status: tournament.status,
      platformFeePercent: tournament.platformFeePercent,
      prizeStructure: tournament.prizeStructure,
      escrowAddress: tournament.escrowAddress,
      metadata: tournament.metadata,
      registrationStart: tournament.registrationStart,
      registrationEnd: tournament.registrationEnd,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      createdAt: tournament.createdAt,
    };
  }
}
