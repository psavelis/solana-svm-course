import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * # Match Status
 *
 * Lifecycle states for monetized competitive matches.
 *
 * ## State Machine Flow
 *
 * ```
 * CREATED → WAITING → READY → STARTING → IN_PROGRESS → COMPLETED → SETTLED
 *     ↓         ↓        ↓                    ↓
 * CANCELLED  CANCELLED  CANCELLED         DISPUTED → SETTLED
 * ```
 *
 * ## Status Descriptions
 *
 * | Status | Description | Escrow State |
 * |--------|-------------|--------------|
 * | CREATED | Match initialized, waiting for first player | CREATED |
 * | WAITING | Players joining, entry fees collecting | ACTIVE |
 * | READY | Min players reached, can start | ACTIVE |
 * | STARTING | Match starting, escrow locking | LOCKED |
 * | IN_PROGRESS | Match active, gameplay in progress | LOCKED |
 * | COMPLETED | Match finished, result submitted | LOCKED |
 * | DISPUTED | Result contested, under review | LOCKED |
 * | CANCELLED | Match cancelled, refunds issued | REFUNDED |
 * | SETTLED | Prizes distributed, final state | RELEASED |
 *
 * @see EscrowStatus - Corresponding escrow states
 */
export enum MatchStatus {
  /** Match created, awaiting first player join */
  CREATED = 'created',
  /** Players joining, collecting entry fees */
  WAITING = 'waiting',
  /** Minimum players reached, ready to start */
  READY = 'ready',
  /** Match starting, escrow being locked */
  STARTING = 'starting',
  /** Gameplay active */
  IN_PROGRESS = 'in_progress',
  /** Match finished, result submitted */
  COMPLETED = 'completed',
  /** Result disputed, under review */
  DISPUTED = 'disputed',
  /** Match cancelled, all entry fees refunded */
  CANCELLED = 'cancelled',
  /** Prizes distributed, match finalized */
  SETTLED = 'settled',
}

/**
 * # Game Type
 *
 * Supported competitive match formats.
 *
 * ## Format Specifications
 *
 * | Type | Players | Prize Distribution |
 * |------|---------|-------------------|
 * | DUEL | 2 (1v1) | Winner takes all |
 * | TEAM_VS_TEAM | 4-20 | Winning team splits |
 * | FREE_FOR_ALL | 3-100 | Top N placement rewards |
 * | BATTLE_ROYALE | 20-100 | Tiered placement prizes |
 *
 * @example
 * ```typescript
 * // 1v1 duel with winner-takes-all
 * { gameType: GameType.DUEL, maxPlayers: 2 }
 *
 * // 5v5 team match
 * { gameType: GameType.TEAM_VS_TEAM, maxPlayers: 10 }
 * ```
 */
export enum GameType {
  /** 1v1 head-to-head match */
  DUEL = 'duel',
  /** Team-based competition (e.g., 5v5) */
  TEAM_VS_TEAM = 'team_vs_team',
  /** Multi-player free-for-all */
  FREE_FOR_ALL = 'free_for_all',
  /** Large-scale last-player-standing */
  BATTLE_ROYALE = 'battle_royale',
}

/**
 * # Match Entity
 *
 * Core entity for monetized competitive gaming matches.
 *
 * ## Overview
 *
 * Represents a single competitive match with:
 * - Entry fee collection and escrow management
 * - Player participation tracking
 * - Result submission and verification
 * - Automated prize distribution
 *
 * ## Prize Pool Calculation
 *
 * ```
 * Total Pool = Entry Fee × Number of Players
 * Platform Fee = Total Pool × (Platform Fee % / 100)
 * Winner Prize = Total Pool - Platform Fee
 * ```
 *
 * ## Business Rules
 *
 * | Rule | Constraint |
 * |------|------------|
 * | Min Entry Fee | 0.001 SOL (1,000,000 lamports) |
 * | Max Entry Fee | 100 SOL (100,000,000,000 lamports) |
 * | Platform Fee | 1-10% (default 5%) |
 * | Join Window | Until match starts or max players |
 *
 * ## Related Entities
 *
 * - {@link MatchParticipant} - Player participation records
 * - {@link EscrowAccount} - Fund holding during match
 * - {@link PrizeDistribution} - Prize payout records
 *
 * @see [docs/diagrams/16-esports-matchmaking.md](docs/diagrams/16-esports-matchmaking.md)
 */
@Entity('esports_matches')
@Index(['status', 'gameType'])
@Index(['scheduledAt'])
export class Match {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Public match identifier for API references */
  @Column({ unique: true })
  matchId: string;

  /**
   * Match format type
   * @see GameType
   */
  @Column({
    type: 'enum',
    enum: GameType,
    default: GameType.DUEL,
  })
  gameType: GameType;

  /**
   * Entry fee in lamports (1 SOL = 1,000,000,000 lamports)
   * @example "1000000000" // 1 SOL
   */
  @Column({ type: 'bigint' })
  entryFee: string;

  /** Minimum players required to start the match */
  @Column({ type: 'int', default: 2 })
  minPlayers: number;

  /** Maximum players allowed in the match */
  @Column({ type: 'int', default: 2 })
  maxPlayers: number;

  /**
   * Current prize pool in lamports
   * Calculated as: entryFee × currentPlayers
   */
  @Column({ type: 'bigint', default: '0' })
  prizePool: string;

  /**
   * Platform fee percentage (basis: 100 = 1%)
   * @default 5.0 (5%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  /**
   * Current match status
   * @see MatchStatus
   */
  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.CREATED,
  })
  status: MatchStatus;

  /** Winner player ID (set after result submission) */
  @Column({ nullable: true })
  winnerId: string;

  /** Solana PDA escrow address holding match funds */
  @Column({ nullable: true })
  escrowAddress: string;

  /**
   * Match metadata
   * @property gameName - Game title (e.g., "Counter-Strike 2")
   * @property gameMode - Mode variant (e.g., "Competitive")
   * @property region - Geographic region (e.g., "NA-East")
   * @property skillBracket - Skill tier (e.g., "Diamond")
   * @property rules - Custom match rules
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    gameName?: string;
    gameMode?: string;
    region?: string;
    skillBracket?: string;
    rules?: Record<string, unknown>;
  };

  /**
   * Match result data
   * @property winnerIds - Array of winning player IDs
   * @property scores - Score by player ID
   * @property proof - Result verification (hash, URL)
   * @property submittedBy - User who submitted result
   * @property verifiedAt - Verification timestamp
   */
  @Column({ type: 'jsonb', nullable: true })
  result: {
    winnerIds?: string[];
    scores?: Record<string, number>;
    proof?: string;
    submittedBy?: string;
    verifiedAt?: Date;
  };

  /** Match participants */
  @OneToMany(() => MatchParticipant, (participant) => participant.match, {
    cascade: true,
  })
  participants: MatchParticipant[];

  /** Scheduled start time (optional) */
  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  /** Actual start time */
  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  /** Match end time */
  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Check if match can accept new players
   * @returns true if status allows joining and capacity available
   */
  isJoinable(): boolean {
    return (
      [MatchStatus.CREATED, MatchStatus.WAITING].includes(this.status) &&
      (this.participants?.length ?? 0) < this.maxPlayers
    );
  }

  /**
   * Check if minimum players requirement is met
   * @returns true if enough players have joined
   */
  isReady(): boolean {
    return (this.participants?.length ?? 0) >= this.minPlayers;
  }

  /**
   * Check if match can be started
   * @returns true if status is READY and min players met
   */
  canStart(): boolean {
    return this.status === MatchStatus.READY && this.isReady();
  }

  /**
   * Get count of active players (JOINED status)
   * @returns number of currently active participants
   */
  getCurrentPlayerCount(): number {
    return this.participants?.filter((p) => p.status === ParticipantStatus.JOINED).length ?? 0;
  }
}

/**
 * # Participant Status
 *
 * Lifecycle states for match participants.
 *
 * ## State Flow
 *
 * ```
 * PENDING → JOINED → READY → PLAYING → FINISHED
 *     ↓        ↓        ↓         ↓
 * WITHDRAWN WITHDRAWN DISQUALIFIED DISQUALIFIED
 * ```
 *
 * @see MatchParticipant - Participant entity
 */
export enum ParticipantStatus {
  /** Entry fee pending, not yet confirmed */
  PENDING = 'pending',
  /** Entry fee paid, in match lobby */
  JOINED = 'joined',
  /** Player marked ready to play */
  READY = 'ready',
  /** Currently in active gameplay */
  PLAYING = 'playing',
  /** Match complete for this player */
  FINISHED = 'finished',
  /** Removed from match (cheating, AFK, etc.) */
  DISQUALIFIED = 'disqualified',
  /** Player withdrew before match start */
  WITHDRAWN = 'withdrawn',
}

/**
 * # Match Participant Entity
 *
 * Tracks individual player participation in matches.
 *
 * ## Overview
 *
 * Records player's journey through match lifecycle:
 * - Entry fee payment and confirmation
 * - Ready status tracking
 * - Final placement and prize won
 *
 * ## Business Rules
 *
 * | Rule | Constraint |
 * |------|------------|
 * | Entry Fee | Must be paid before JOINED status |
 * | Ready Timeout | 5 minutes to mark ready |
 * | Withdrawal | Only allowed before PLAYING status |
 * | Prize | Credited after match settlement |
 *
 * @see Match - Parent match entity
 * @see PlayerWallet - Wallet for entry fee payment
 */
@Entity('esports_match_participants')
@Index(['matchId', 'walletId'], { unique: true })
export class MatchParticipant {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to parent match */
  @Column()
  matchId: string;

  /** Parent match relation */
  @ManyToOne(() => Match, (match) => match.participants)
  @JoinColumn({ name: 'matchId' })
  match: Match;

  /** Player's wallet ID (for entry fee/prizes) */
  @Column()
  walletId: string;

  /** Player's unique identifier */
  @Column()
  playerId: string;

  /**
   * Current participation status
   * @see ParticipantStatus
   */
  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  /** Final placement (1 = winner, null = no result) */
  @Column({ type: 'int', nullable: true })
  placement: number;

  /** Prize won in lamports (0 if not winner) */
  @Column({ type: 'bigint', default: '0' })
  prizeWon: string;

  /** Solana signature of entry fee payment */
  @Column({ nullable: true })
  entrySignature: string;

  /**
   * Participant metadata
   * @property teamId - Team identifier for team matches
   * @property displayName - Public display name
   * @property avatar - Avatar URL
   * @property skillRating - Player's ELO/MMR rating
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    teamId?: string;
    displayName?: string;
    avatar?: string;
    skillRating?: number;
  };

  /** Time when player joined the match */
  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  /** Time when player marked ready */
  @Column({ type: 'timestamp', nullable: true })
  readyAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
