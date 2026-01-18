import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EsportsController } from './esports.controller';

import {
  Match,
  MatchParticipant,
  Tournament,
  TournamentRegistration,
  PlayerWallet,
  WalletTransaction,
  EscrowAccount,
  EscrowTransaction,
  PrizeDistribution,
} from './entities';

import {
  EscrowService,
  PlayerWalletService,
  MatchmakingService,
  PrizeDistributionService,
  TournamentService,
} from './services';

import { MpcModule } from '../mpc/mpc.module';

/**
 * # Esports Module
 *
 * Production-grade monetized competitive gaming infrastructure on Solana.
 *
 * ## Features
 *
 * - **Monetized Matchmaking**: Entry fee collection, escrow management, automated payouts
 * - **MPC Wallets**: 2-of-3 threshold signature wallets for secure player earnings
 * - **Prize Distribution**: Automatic prize calculation and multi-recipient transfers
 * - **Tournament Management**: Bracket generation, round advancement, final rankings
 *
 * ## Architecture
 *
 * ```
 * EsportsController
 *     ├── MatchmakingService
 *     │       ├── EscrowService
 *     │       ├── PlayerWalletService → MpcService
 *     │       └── PrizeDistributionService
 *     ├── TournamentService
 *     │       ├── MatchmakingService
 *     │       └── PrizeDistributionService
 *     └── PlayerWalletService
 *             └── MpcService (2-of-3 threshold signing)
 * ```
 *
 * ## Security
 *
 * - Entry fees locked in escrow until match completion
 * - MPC wallets require 2-of-3 signatures for withdrawals
 * - Daily withdrawal limits and cooldown periods
 * - Atomic prize distributions
 *
 * @see [docs/diagrams/16-esports-matchmaking.md](docs/diagrams/16-esports-matchmaking.md)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Match,
      MatchParticipant,
      Tournament,
      TournamentRegistration,
      PlayerWallet,
      WalletTransaction,
      EscrowAccount,
      EscrowTransaction,
      PrizeDistribution,
    ]),
    MpcModule,
  ],
  controllers: [EsportsController],
  providers: [
    EscrowService,
    PlayerWalletService,
    MatchmakingService,
    PrizeDistributionService,
    TournamentService,
  ],
  exports: [
    EscrowService,
    PlayerWalletService,
    MatchmakingService,
    PrizeDistributionService,
    TournamentService,
  ],
})
export class EsportsModule {}
