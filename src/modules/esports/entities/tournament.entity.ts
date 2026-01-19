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
 * # Tournament Status
 *
 * Lifecycle states for esports tournaments.
 *
 * ## State Machine Flow
 *
 * ```
 * DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → BRACKET_GENERATED
 *   ↓            ↓                    ↓                    ↓
 * CANCELLED  CANCELLED           CANCELLED          IN_PROGRESS → COMPLETED
 *                                                        ↓
 *                                                    CANCELLED
 * ```
 *
 * ## Status Descriptions
 *
 * | Status | Description | Escrow State |
 * |--------|-------------|--------------|
 * | DRAFT | Tournament created, not yet published | N/A |
 * | REGISTRATION_OPEN | Accepting player registrations | ACTIVE |
 * | REGISTRATION_CLOSED | Registration ended, preparing | ACTIVE |
 * | BRACKET_GENERATED | Seeded bracket created | LOCKED |
 * | IN_PROGRESS | Tournament matches ongoing | LOCKED |
 * | COMPLETED | Tournament finished, prizes distributed | RELEASED |
 * | CANCELLED | Tournament cancelled, refunds issued | REFUNDED |
 *
 * @see EscrowStatus - Corresponding escrow states
 */
export enum TournamentStatus {
  /** Tournament created but not published */
  DRAFT = 'draft',
  /** Accepting player registrations */
  REGISTRATION_OPEN = 'registration_open',
  /** Registration period ended */
  REGISTRATION_CLOSED = 'registration_closed',
  /** Seeded bracket generated */
  BRACKET_GENERATED = 'bracket_generated',
  /** Tournament matches in progress */
  IN_PROGRESS = 'in_progress',
  /** Tournament completed, prizes distributed */
  COMPLETED = 'completed',
  /** Tournament cancelled, all refunded */
  CANCELLED = 'cancelled',
}

/**
 * # Bracket Type
 *
 * Tournament bracket formats.
 *
 * ## Format Specifications
 *
 * | Type | Elimination | Best For |
 * |------|-------------|----------|
 * | SINGLE_ELIMINATION | 1 loss = out | Fast tournaments |
 * | DOUBLE_ELIMINATION | 2 losses = out | Competitive fairness |
 * | ROUND_ROBIN | Play all opponents | Small groups (4-8) |
 * | SWISS | Paired by record | Medium groups (8-32) |
 *
 * @example
 * ```typescript
 * // 16-player single elimination
 * { bracketType: BracketType.SINGLE_ELIMINATION, maxParticipants: 16 }
 * // Results in 4 rounds: 8 → 4 → 2 → Final
 * ```
 */
export enum BracketType {
  /** Single loss eliminates player */
  SINGLE_ELIMINATION = 'single_elimination',
  /** Two losses required for elimination */
  DOUBLE_ELIMINATION = 'double_elimination',
  /** All players face each other */
  ROUND_ROBIN = 'round_robin',
  /** Swiss pairing system */
  SWISS = 'swiss',
}

/**
 * # Registration Status
 *
 * Player registration states within a tournament.
 *
 * ## State Flow
 *
 * ```
 * PENDING → CONFIRMED → CHECKED_IN → (competing) → ELIMINATED
 *    ↓          ↓           ↓
 * WITHDRAWN  WITHDRAWN  DISQUALIFIED
 * ```
 */
export enum RegistrationStatus {
  /** Entry fee pending confirmation */
  PENDING = 'pending',
  /** Registration confirmed, entry fee paid */
  CONFIRMED = 'confirmed',
  /** Player checked in before tournament start */
  CHECKED_IN = 'checked_in',
  /** Eliminated from tournament */
  ELIMINATED = 'eliminated',
  /** Player withdrew from tournament */
  WITHDRAWN = 'withdrawn',
  /** Removed for rule violation */
  DISQUALIFIED = 'disqualified',
}

/**
 * # Tournament Entity
 *
 * Core entity for organized esports tournaments.
 *
 * ## Overview
 *
 * Manages multi-player tournament competitions with:
 * - Configurable prize structures
 * - Guaranteed prize pools (GPP)
 * - Automated bracket generation
 * - Seeded matchups by skill rating
 *
 * ## Prize Pool Calculation
 *
 * ```
 * Collected Pool = Entry Fee × Registered Players
 * Guaranteed Pool = max(Collected, GuaranteedPrizePool)
 * Platform Overlay = max(0, Guaranteed - Collected)
 * Platform Fee = Guaranteed × (Fee% / 100)
 * Distributable = Guaranteed - Platform Fee
 * ```
 *
 * ## Prize Structure Example
 *
 * | Place | Percentage | Amount (100 SOL pool) |
 * |-------|------------|----------------------|
 * | 1st | 50% | 47.5 SOL |
 * | 2nd | 25% | 23.75 SOL |
 * | 3rd-4th | 12.5% each | 11.875 SOL each |
 *
 * ## Business Rules
 *
 * | Rule | Constraint |
 * |------|------------|
 * | Min Participants | 2 (configurable) |
 * | Max Participants | 1024 (power of 2 preferred) |
 * | Registration Window | Opens 7 days before start |
 * | Withdrawal Deadline | 24 hours before start |
 * | Late Withdrawal Fee | 50% entry fee forfeited |
 *
 * @see TournamentRegistration - Player registrations
 * @see [docs/diagrams/16-esports-matchmaking.md](docs/diagrams/16-esports-matchmaking.md)
 */
@Entity('esports_tournaments')
@Index(['status'])
@Index(['registrationStart', 'registrationEnd'])
export class Tournament {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Public tournament identifier for API references */
  @Column({ unique: true })
  tournamentId: string;

  /** Tournament display name */
  @Column()
  name: string;

  /** Tournament description and rules summary */
  @Column({ type: 'text', nullable: true })
  description: string;

  /** Game identifier (e.g., "valorant", "cs2") */
  @Column({ type: 'varchar', length: 100 })
  gameType: string;

  /**
   * Entry fee in lamports
   * @example "5000000000" // 5 SOL
   */
  @Column({ type: 'bigint' })
  entryFee: string;

  /**
   * Current prize pool (entry fees collected)
   * Updated as players register
   */
  @Column({ type: 'bigint', default: '0' })
  prizePool: string;

  /**
   * Guaranteed minimum prize pool
   * Platform covers shortfall (overlay)
   */
  @Column({ type: 'bigint', default: '0' })
  guaranteedPrizePool: string;

  /** Maximum number of participants */
  @Column({ type: 'int' })
  maxParticipants: number;

  /** Minimum participants required to start */
  @Column({ type: 'int', default: 2 })
  minParticipants: number;

  /**
   * Tournament bracket format
   * @see BracketType
   */
  @Column({
    type: 'enum',
    enum: BracketType,
    default: BracketType.SINGLE_ELIMINATION,
  })
  bracketType: BracketType;

  /**
   * Current tournament status
   * @see TournamentStatus
   */
  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  /**
   * Platform fee percentage
   * @default 5.0 (5%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  /**
   * Prize distribution structure
   * @property place - Placement position (1 = winner)
   * @property percentage - Percentage of distributable pool
   * @property fixedAmount - Optional fixed amount override
   */
  @Column({ type: 'jsonb' })
  prizeStructure: {
    place: number;
    percentage: number;
    fixedAmount?: string;
  }[];

  /** Solana PDA escrow address */
  @Column({ nullable: true })
  escrowAddress: string;

  /**
   * Tournament metadata
   * @property region - Geographic restriction
   * @property skillBracket - Skill tier requirement
   * @property rules - Full ruleset URL/text
   * @property streamUrl - Official stream URL
   * @property organizerId - Organizer user ID
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    region?: string;
    skillBracket?: string;
    rules?: string;
    streamUrl?: string;
    organizerId?: string;
  };

  /**
   * Generated bracket structure
   * @property rounds - Array of tournament rounds
   * @property rounds[].matches - Matches in each round
   */
  @Column({ type: 'jsonb', nullable: true })
  bracket: {
    rounds: {
      roundNumber: number;
      matches: {
        matchId: string;
        player1Id?: string;
        player2Id?: string;
        winnerId?: string;
        status: string;
      }[];
    }[];
  };

  /** Player registrations */
  @OneToMany(() => TournamentRegistration, (reg) => reg.tournament, {
    cascade: true,
  })
  registrations: TournamentRegistration[];

  /** Registration window start time */
  @Column({ type: 'timestamp' })
  registrationStart: Date;

  /** Registration window end time */
  @Column({ type: 'timestamp' })
  registrationEnd: Date;

  /** Tournament start date */
  @Column({ type: 'timestamp' })
  startDate: Date;

  /** Tournament end date (set when completed) */
  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Check if registration is currently open
   * @returns true if within registration window and capacity available
   */
  isRegistrationOpen(): boolean {
    const now = new Date();
    return (
      this.status === TournamentStatus.REGISTRATION_OPEN &&
      now >= this.registrationStart &&
      now <= this.registrationEnd &&
      this.getCurrentParticipantCount() < this.maxParticipants
    );
  }

  /**
   * Get count of confirmed/checked-in participants
   * @returns number of active registrations
   */
  getCurrentParticipantCount(): number {
    return (
      this.registrations?.filter(
        (r) =>
          r.status === RegistrationStatus.CONFIRMED || r.status === RegistrationStatus.CHECKED_IN,
      ).length ?? 0
    );
  }

  /**
   * Check if bracket can be generated
   * @returns true if registration closed and min participants met
   */
  canGenerateBracket(): boolean {
    return (
      this.status === TournamentStatus.REGISTRATION_CLOSED &&
      this.getCurrentParticipantCount() >= this.minParticipants
    );
  }
}

/**
 * # Tournament Registration Entity
 *
 * Tracks individual player registration in tournaments.
 *
 * ## Overview
 *
 * Records player's tournament journey:
 * - Entry fee payment confirmation
 * - Seed assignment for bracket placement
 * - Final placement and prize winnings
 *
 * ## Seeding Logic
 *
 * Players are seeded by:
 * 1. Skill rating (if available)
 * 2. Registration order (fallback)
 *
 * Standard seeding matchups (16 players):
 * - Round 1: Seed 1 vs 16, 2 vs 15, 3 vs 14, etc.
 *
 * ## Withdrawal Rules
 *
 * | Timing | Refund | Penalty |
 * |--------|--------|---------|
 * | > 24h before | 100% | None |
 * | 12-24h before | 75% | None |
 * | 6-12h before | 50% | Warning |
 * | < 6h before | 25% | Rating penalty |
 * | No-show | 0% | 24h ban |
 *
 * @see Tournament - Parent tournament entity
 * @see PlayerWallet - Wallet for payments
 */
@Entity('esports_tournament_registrations')
@Index(['tournamentId', 'walletId'], { unique: true })
export class TournamentRegistration {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to parent tournament */
  @Column()
  tournamentId: string;

  /** Parent tournament relation */
  @ManyToOne(() => Tournament, (tournament) => tournament.registrations)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  /** Player's wallet ID (for entry fee/prizes) */
  @Column()
  walletId: string;

  /** Player's unique identifier */
  @Column()
  playerId: string;

  /**
   * Tournament seed (1 = highest)
   * Determines bracket placement
   */
  @Column({ type: 'int', nullable: true })
  seed: number;

  /**
   * Current registration status
   * @see RegistrationStatus
   */
  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  /** Solana signature of entry fee payment */
  @Column({ nullable: true })
  paymentSignature: string;

  /** Final tournament placement (null if still competing) */
  @Column({ type: 'int', nullable: true })
  finalPlacement: number;

  /** Prize won in lamports */
  @Column({ type: 'bigint', default: '0' })
  prizeWon: string;

  /**
   * Registration metadata
   * @property teamName - Team display name
   * @property displayName - Player display name
   * @property skillRating - Player's rating for seeding
   * @property checkInTime - When player checked in
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    teamName?: string;
    displayName?: string;
    skillRating?: number;
    checkInTime?: Date;
  };

  /** Time of registration */
  @Column({ type: 'timestamp' })
  registeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
