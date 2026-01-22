import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { SupportedToken } from './token.entity';

/**
 * # Escrow Status
 *
 * Lifecycle states for escrow accounts.
 *
 * ## State Machine Flow
 *
 * ```
 * CREATED → ACTIVE → LOCKED → RELEASING → RELEASED
 *              ↓        ↓         ↓
 *           CLOSED  REFUNDING → REFUNDED → CLOSED
 * ```
 *
 * ## Status Descriptions
 *
 * | Status | Description | Deposits | Withdrawals |
 * |--------|-------------|----------|-------------|
 * | CREATED | Escrow initialized | ✅ | ❌ |
 * | ACTIVE | Accepting deposits | ✅ | ❌ |
 * | LOCKED | Match/tournament started | ❌ | ❌ |
 * | RELEASING | Prize distribution in progress | ❌ | ✅ |
 * | RELEASED | All prizes distributed | ❌ | ❌ |
 * | REFUNDING | Refund in progress | ❌ | ✅ |
 * | REFUNDED | All funds returned | ❌ | ❌ |
 * | CLOSED | Final state, no operations | ❌ | ❌ |
 *
 * @see EscrowAccount - Escrow entity
 */
export enum EscrowStatus {
  /** Escrow account created, awaiting deposits */
  CREATED = 'created',
  /** Actively collecting entry fees */
  ACTIVE = 'active',
  /** Funds locked, match/tournament in progress */
  LOCKED = 'locked',
  /** Prize distribution in progress */
  RELEASING = 'releasing',
  /** All prizes distributed successfully */
  RELEASED = 'released',
  /** Refund process in progress */
  REFUNDING = 'refunding',
  /** All funds refunded (cancellation) */
  REFUNDED = 'refunded',
  /** Account closed, final state */
  CLOSED = 'closed',
}

/**
 * # Escrow Source Type
 *
 * Type of competition the escrow is associated with.
 */
export enum EscrowSourceType {
  /** Escrow for a single match */
  MATCH = 'match',
  /** Escrow for a tournament */
  TOURNAMENT = 'tournament',
}

/**
 * # Escrow Transaction Type
 *
 * Types of escrow account operations.
 */
export enum EscrowTransactionType {
  /** Entry fee deposit into escrow */
  DEPOSIT = 'deposit',
  /** Prize release to winner */
  RELEASE = 'release',
  /** Refund to participant (cancellation) */
  REFUND = 'refund',
  /** Platform fee collection */
  PLATFORM_FEE = 'platform_fee',
}

/**
 * # Escrow Account Entity
 *
 * Trustless fund management for esports competitions.
 *
 * ## Overview
 *
 * Escrow accounts provide:
 * - Secure custody of entry fees until match completion
 * - Atomic prize distribution to winners
 * - Automatic refunds on cancellation
 * - Platform fee collection
 *
 * ## Solana Implementation
 *
 * Escrow uses Program Derived Addresses (PDAs):
 * ```
 * seeds = ["escrow", sourceType, sourceId]
 * escrowAddress = findProgramAddress(seeds, PROGRAM_ID)
 * ```
 *
 * ## Balance Tracking
 *
 * ```
 * currentBalance = totalDeposited - totalReleased - totalRefunded - platformFeeCollected
 * ```
 *
 * ## Security Model
 *
 * | Operation | Authority Required |
 * |-----------|-------------------|
 * | Deposit | Any participant |
 * | Lock | Match service only |
 * | Release | Platform signer + result verification |
 * | Refund | Platform signer + cancellation proof |
 *
 * @see EscrowTransaction - Transaction log
 * @see Match - Associated match (if MATCH type)
 * @see Tournament - Associated tournament (if TOURNAMENT type)
 */
@Entity('esports_escrow_accounts')
@Index(['sourceType', 'sourceId'])
@Index(['status'])
@Index(['tokenType'])
export class EscrowAccount {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Public escrow identifier for API references */
  @Column({ unique: true })
  escrowId: string;

  /** Solana PDA address for this escrow */
  @Column()
  escrowAddress: string;

  /**
   * Token type for this escrow
   * @see SupportedToken
   *
   * ## Multi-Token Escrow
   *
   * Each escrow account is token-specific:
   * - SOL escrows hold native SOL
   * - SPL escrows hold specific token (USDC, USDT, etc.)
   *
   * @security CRITICAL: Token type is immutable after creation
   */
  @Column({
    type: 'enum',
    enum: SupportedToken,
    default: SupportedToken.SOL,
  })
  tokenType: SupportedToken;

  /**
   * SPL Token mint address (null for native SOL)
   * @security Must be verified against TOKEN_CONFIG
   */
  @Column({ nullable: true })
  tokenMint: string;

  /**
   * Associated Token Account (ATA) for SPL tokens
   * Derived from escrow PDA and token mint
   */
  @Column({ nullable: true })
  ataAddress: string;

  /**
   * Type of competition
   * @see EscrowSourceType
   */
  @Column({
    type: 'enum',
    enum: EscrowSourceType,
  })
  sourceType: EscrowSourceType;

  /** Match ID or Tournament ID */
  @Column()
  sourceId: string;

  /** Total deposited into escrow (lamports) */
  @Column({ type: 'bigint', default: '0' })
  totalDeposited: string;

  /** Total released as prizes (lamports) */
  @Column({ type: 'bigint', default: '0' })
  totalReleased: string;

  /** Total refunded to participants (lamports) */
  @Column({ type: 'bigint', default: '0' })
  totalRefunded: string;

  /** Platform fee collected (lamports) */
  @Column({ type: 'bigint', default: '0' })
  platformFeeCollected: string;

  /** Current escrow balance (lamports) */
  @Column({ type: 'bigint', default: '0' })
  currentBalance: string;

  /**
   * Current escrow status
   * @see EscrowStatus
   */
  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.CREATED,
  })
  status: EscrowStatus;

  /**
   * Platform fee percentage for this escrow
   * @default 5.0 (5%)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  /**
   * Escrow metadata
   * @property createdBy - User who created the escrow
   * @property lockedAt - When escrow was locked
   * @property releaseReason - Reason for release
   * @property refundReason - Reason for refund
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    createdBy?: string;
    lockedAt?: Date;
    releaseReason?: string;
    refundReason?: string;
  };

  /** Transaction history */
  @OneToMany(() => EscrowTransaction, (tx) => tx.escrow, { cascade: true })
  transactions: EscrowTransaction[];

  /** Timestamp when escrow was locked */
  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date;

  /** Timestamp when escrow was closed */
  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Check if escrow can accept deposits
   * @returns true if status is CREATED or ACTIVE
   */
  isActive(): boolean {
    return [EscrowStatus.CREATED, EscrowStatus.ACTIVE].includes(this.status);
  }

  /**
   * Check if escrow is locked
   * @returns true if status is LOCKED
   */
  isLocked(): boolean {
    return this.status === EscrowStatus.LOCKED;
  }

  /**
   * Check if deposits are allowed
   * @returns true if escrow is accepting deposits
   */
  canDeposit(): boolean {
    return this.isActive();
  }

  /**
   * Check if prizes can be released
   * @returns true if locked and has balance
   */
  canRelease(): boolean {
    return this.status === EscrowStatus.LOCKED && BigInt(this.currentBalance) > 0;
  }

  /**
   * Check if refunds can be processed
   * @returns true if active/locked and has balance
   */
  canRefund(): boolean {
    return (
      [EscrowStatus.ACTIVE, EscrowStatus.LOCKED].includes(this.status) &&
      BigInt(this.currentBalance) > 0
    );
  }
}

/**
 * # Escrow Transaction Entity
 *
 * Audit log for escrow account operations.
 *
 * ## Overview
 *
 * Immutable record of every escrow operation:
 * - Entry fee deposits
 * - Prize releases
 * - Refunds
 * - Platform fee collection
 *
 * ## Transaction Types
 *
 * | Type | Direction | When |
 * |------|-----------|------|
 * | DEPOSIT | In | Player joins match/tournament |
 * | RELEASE | Out | Prize distribution to winner |
 * | REFUND | Out | Match/tournament cancelled |
 * | PLATFORM_FEE | Out | Fee collection at settlement |
 *
 * @see EscrowAccount - Parent escrow account
 */
@Entity('esports_escrow_transactions')
@Index(['escrowId', 'createdAt'])
@Index(['participantWalletId'])
export class EscrowTransaction {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to parent escrow account */
  @Column()
  escrowId: string;

  /** Parent escrow relation */
  @Column(() => EscrowAccount)
  escrow: EscrowAccount;

  /**
   * Transaction type
   * @see EscrowTransactionType
   */
  @Column({
    type: 'enum',
    enum: EscrowTransactionType,
  })
  type: EscrowTransactionType;

  /** Participant wallet ID (null for platform fee) */
  @Column({ nullable: true })
  participantWalletId: string;

  /** Transaction amount in lamports */
  @Column({ type: 'bigint' })
  amount: string;

  /** Solana transaction signature */
  @Column({ nullable: true })
  signature: string;

  /**
   * Transaction metadata
   * @property fromAddress - Source Solana address
   * @property toAddress - Destination Solana address
   * @property placement - Winner placement (for releases)
   * @property prizePercentage - Prize percentage (for releases)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    fromAddress?: string;
    toAddress?: string;
    placement?: number;
    prizePercentage?: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}
