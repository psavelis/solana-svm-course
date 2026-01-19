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
   * Individual prize distributions
   * @property walletId - Recipient wallet ID
   * @property playerId - Recipient player ID
   * @property placement - Final placement (1 = winner)
   * @property amount - Prize amount in lamports
   * @property percentage - Prize percentage of pool
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
