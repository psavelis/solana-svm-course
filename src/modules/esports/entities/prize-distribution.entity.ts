import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * # Prize Distribution Status
 *
 * Processing states for prize distribution operations.
 *
 * ## State Flow
 *
 * ```
 * PENDING → CALCULATING → PROCESSING → COMPLETED
 *              ↓              ↓
 *           FAILED        PARTIAL → (retry) → COMPLETED
 * ```
 *
 * ## Status Descriptions
 *
 * | Status | Description | Action |
 * |--------|-------------|--------|
 * | PENDING | Distribution requested | Awaiting processing |
 * | CALCULATING | Computing prize amounts | Fee deduction, splits |
 * | PROCESSING | Crediting winner wallets | One by one |
 * | COMPLETED | All prizes distributed | Final state |
 * | PARTIAL | Some distributions failed | Retry failed only |
 * | FAILED | Distribution failed entirely | Manual intervention |
 */
export enum PrizeDistributionStatus {
  /** Distribution requested, awaiting processing */
  PENDING = 'pending',
  /** Calculating prize amounts and fee deductions */
  CALCULATING = 'calculating',
  /** Crediting winner wallets in progress */
  PROCESSING = 'processing',
  /** All prizes distributed successfully */
  COMPLETED = 'completed',
  /** Some distributions succeeded, others failed */
  PARTIAL = 'partial',
  /** Distribution failed entirely */
  FAILED = 'failed',
}

/**
 * # Prize Source Type
 *
 * Type of competition the prize is from.
 */
export enum PrizeSourceType {
  /** Prize from a single match */
  MATCH = 'match',
  /** Prize from a tournament */
  TOURNAMENT = 'tournament',
}

/**
 * # Prize Distribution Strategy
 *
 * Defines how the prize pool is distributed among participants.
 *
 * ## Strategy Overview
 *
 * | Strategy | Risk Level | Distribution Pattern |
 * |----------|------------|---------------------|
 * | WINNER_TAKES_ALL | High | 100% to winner |
 * | TOP_3_SPLIT | Medium | 60%/30%/10% to top 3 |
 * | PERFORMANCE_MVP | Low | 70%/20%/10% (winner/2nd/MVP) |
 * | CUSTOM | Variable | User-defined structure |
 *
 * ## Use Cases
 *
 * ```
 * WINNER_TAKES_ALL:
 *   - High-stakes 1v1 duels
 *   - Maximum competitive pressure
 *   - Simple winner determination
 *
 * TOP_3_SPLIT:
 *   - Multi-player tournaments
 *   - Rewards multiple performers
 *   - Reduces winner-take-all variance
 *
 * PERFORMANCE_MVP:
 *   - Team-based competitions
 *   - Recognizes individual excellence
 *   - Balances team and individual rewards
 * ```
 *
 * @example
 * ```typescript
 * // Winner takes all for 1v1
 * { strategy: PrizeDistributionStrategy.WINNER_TAKES_ALL }
 *
 * // Top 3 for tournament
 * { strategy: PrizeDistributionStrategy.TOP_3_SPLIT }
 *
 * // MVP bonus for team match
 * { strategy: PrizeDistributionStrategy.PERFORMANCE_MVP, mvpPlayerId: 'player_mvp' }
 * ```
 */
export enum PrizeDistributionStrategy {
  /** 100% to the winner (high risk, high reward) */
  WINNER_TAKES_ALL = 'winner_takes_all',
  /** 60%/30%/10% split to top 3 (medium risk) */
  TOP_3_SPLIT = 'top_3_split',
  /** 70% winner, 20% 2nd place, 10% MVP bonus (low risk) */
  PERFORMANCE_MVP = 'performance_mvp',
  /** Custom prize structure defined in prizeStructure field */
  CUSTOM = 'custom',
}

/**
 * # Risk Level
 *
 * Indicates the financial risk profile of a prize distribution strategy.
 *
 * ## Risk Assessment
 *
 * | Level | Description | Typical Distribution |
 * |-------|-------------|---------------------|
 * | HIGH | Winner-take-all | Single recipient |
 * | MEDIUM | Top performers | 2-3 recipients |
 * | LOW | Spread rewards | Multiple recipients |
 *
 * Players can filter matches/tournaments by risk level preference.
 */
export enum PrizeRiskLevel {
  /** High risk: Winner takes all */
  HIGH = 'high',
  /** Medium risk: Top 3 split */
  MEDIUM = 'medium',
  /** Low risk: Spread distribution with MVP */
  LOW = 'low',
}

/**
 * # Prize Distribution Entity
 *
 * Manages automated prize distribution for competitions.
 *
 * ## Overview
 *
 * Handles the complete prize distribution workflow:
 * - Prize pool calculation
 * - Platform fee deduction
 * - Individual winner payouts
 * - Partial failure handling
 *
 * ## Prize Calculation
 *
 * ```
 * Total Prize Pool = Sum of all entry fees
 * Platform Fee = Total Pool × (Fee% / 100)
 * Distributable = Total Pool - Platform Fee
 *
 * Per Winner = Distributable × (Winner% / 100)
 * ```
 *
 * ## Distribution Example (2 SOL match, 5% fee)
 *
 * | Component | Amount |
 * |-----------|--------|
 * | Total Pool | 2.0 SOL |
 * | Platform Fee (5%) | 0.1 SOL |
 * | Distributable | 1.9 SOL |
 * | Winner Prize | 1.9 SOL |
 *
 * ## Error Recovery
 *
 * If a distribution fails:
 * 1. Status becomes PARTIAL
 * 2. Failed distributions marked individually
 * 3. Admin can retry failed distributions
 * 4. Retries use same calculation (idempotent)
 *
 * @see Match - Source match (if MATCH type)
 * @see Tournament - Source tournament (if TOURNAMENT type)
 */
@Entity('esports_prize_distributions')
@Index(['sourceType', 'sourceId'])
@Index(['status'])
export class PrizeDistribution {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of source competition
   * @see PrizeSourceType
   */
  @Column({
    type: 'enum',
    enum: PrizeSourceType,
  })
  sourceType: PrizeSourceType;

  /** Match ID or Tournament ID */
  @Column()
  sourceId: string;

  /** Total prize pool before fees (lamports) */
  @Column({ type: 'bigint' })
  totalPrizePool: string;

  /** Platform fee collected (lamports) */
  @Column({ type: 'bigint' })
  platformFee: string;

  /** Amount available for distribution after fees (lamports) */
  @Column({ type: 'bigint' })
  distributableAmount: string;

  /** Amount actually distributed so far (lamports) */
  @Column({ type: 'bigint', default: '0' })
  distributedAmount: string;

  /**
   * Current distribution status
   * @see PrizeDistributionStatus
   */
  @Column({
    type: 'enum',
    enum: PrizeDistributionStatus,
    default: PrizeDistributionStatus.PENDING,
  })
  status: PrizeDistributionStatus;

  /**
   * Prize distribution strategy used
   * @see PrizeDistributionStrategy
   */
  @Column({
    type: 'enum',
    enum: PrizeDistributionStrategy,
    default: PrizeDistributionStrategy.WINNER_TAKES_ALL,
  })
  strategy: PrizeDistributionStrategy;

  /**
   * Risk level associated with the distribution strategy
   * @see PrizeRiskLevel
   */
  @Column({
    type: 'enum',
    enum: PrizeRiskLevel,
    default: PrizeRiskLevel.HIGH,
  })
  riskLevel: PrizeRiskLevel;

  /**
   * Individual prize distributions
   * @property walletId - Recipient wallet ID
   * @property playerId - Recipient player ID
   * @property placement - Final placement (1 = winner)
   * @property amount - Prize amount in lamports
   * @property percentage - Prize percentage of pool
   * @property label - Human-readable prize label (e.g., "1st Place", "MVP Bonus")
   * @property isMvp - Whether this is an MVP bonus distribution
   * @property signature - Solana transaction signature
   * @property status - Individual distribution status
   * @property failureReason - Error message if failed
   * @property processedAt - When distribution was completed
   */
  @Column({ type: 'jsonb' })
  distributions: {
    walletId: string;
    playerId: string;
    placement: number;
    amount: string;
    percentage: number;
    label?: string;
    isMvp?: boolean;
    signature?: string;
    status: 'pending' | 'completed' | 'failed';
    failureReason?: string;
    processedAt?: Date;
  }[];

  /**
   * Distribution metadata
   * @property calculatedAt - When prize calculation was performed
   * @property processedBy - System/user that triggered distribution
   * @property retryCount - Number of retry attempts
   * @property lastError - Most recent error message
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    calculatedAt?: Date;
    processedBy?: string;
    retryCount?: number;
    lastError?: string;
  };

  /** Timestamp when distribution was completed */
  @Column({ type: 'timestamp', nullable: true })
  distributedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Calculate total amount successfully distributed
   * @returns sum of completed distribution amounts
   */
  getTotalDistributed(): bigint {
    return this.distributions
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + BigInt(d.amount), BigInt(0));
  }

  /**
   * Get distributions that still need processing
   * @returns array of pending distributions
   */
  getPendingDistributions(): typeof this.distributions {
    return this.distributions.filter((d) => d.status === 'pending');
  }

  /**
   * Check if all distributions completed successfully
   * @returns true if no pending or failed distributions
   */
  isFullyDistributed(): boolean {
    return this.distributions.every((d) => d.status === 'completed');
  }
}
