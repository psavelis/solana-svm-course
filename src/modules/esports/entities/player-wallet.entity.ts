import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

/**
 * # Player Wallet Status
 *
 * Lifecycle states for MPC-secured player wallets.
 *
 * ## State Flow
 *
 * ```
 * CREATING → ACTIVE → LOCKED → ACTIVE
 *     ↓         ↓        ↓
 *  (failed)  SUSPENDED  CLOSED
 * ```
 *
 * ## Status Descriptions
 *
 * | Status | Description | Withdrawals | Deposits |
 * |--------|-------------|-------------|----------|
 * | CREATING | MPC key generation in progress | ❌ | ❌ |
 * | ACTIVE | Fully operational | ✅ | ✅ |
 * | LOCKED | Temporarily locked (match in progress) | ❌ | ✅ |
 * | SUSPENDED | Admin suspension (investigation) | ❌ | ❌ |
 * | CLOSED | Permanently closed | ❌ | ❌ |
 *
 * @see PlayerWallet - Wallet entity
 */
export enum PlayerWalletStatus {
  /** MPC wallet creation in progress */
  CREATING = 'creating',
  /** Wallet fully operational */
  ACTIVE = 'active',
  /** Temporarily locked (e.g., pending withdrawal) */
  LOCKED = 'locked',
  /** Admin suspension for investigation */
  SUSPENDED = 'suspended',
  /** Permanently closed */
  CLOSED = 'closed',
}

/**
 * # Wallet Transaction Type
 *
 * Types of wallet transactions for audit trail.
 *
 * ## Transaction Categories
 *
 * | Type | Direction | Description |
 * |------|-----------|-------------|
 * | DEPOSIT | In | External SOL deposit |
 * | WITHDRAWAL | Out | MPC-signed withdrawal |
 * | ENTRY_FEE | Out | Match/tournament entry |
 * | PRIZE_WIN | In | Prize distribution |
 * | REFUND | In | Match cancellation refund |
 * | PLATFORM_FEE | Out | Fee deduction |
 * | TRANSFER_IN | In | Internal transfer from another wallet |
 * | TRANSFER_OUT | Out | Internal transfer to another wallet |
 */
export enum WalletTransactionType {
  /** External SOL deposit from Solana address */
  DEPOSIT = 'deposit',
  /** MPC-signed withdrawal to external address */
  WITHDRAWAL = 'withdrawal',
  /** Match or tournament entry fee payment */
  ENTRY_FEE = 'entry_fee',
  /** Prize winnings from match/tournament */
  PRIZE_WIN = 'prize_win',
  /** Refund from cancelled match/tournament */
  REFUND = 'refund',
  /** Platform fee deduction */
  PLATFORM_FEE = 'platform_fee',
  /** Internal transfer received */
  TRANSFER_IN = 'transfer_in',
  /** Internal transfer sent */
  TRANSFER_OUT = 'transfer_out',
}

/**
 * # Wallet Transaction Status
 *
 * Processing states for wallet transactions.
 *
 * ## State Flow
 *
 * ```
 * PENDING → PROCESSING → COMPLETED
 *     ↓          ↓
 * CANCELLED   FAILED
 * ```
 */
export enum WalletTransactionStatus {
  /** Transaction created, awaiting processing */
  PENDING = 'pending',
  /** Transaction being processed (e.g., MPC signing) */
  PROCESSING = 'processing',
  /** Transaction successfully completed */
  COMPLETED = 'completed',
  /** Transaction failed (see failureReason) */
  FAILED = 'failed',
  /** Transaction cancelled by user/system */
  CANCELLED = 'cancelled',
}

/**
 * # Player Wallet Entity
 *
 * MPC-secured wallet for esports platform players.
 *
 * ## Overview
 *
 * Implements 2-of-3 Multi-Party Computation (MPC) threshold signature:
 * - **Share 1**: Player's device (mobile/hardware key)
 * - **Share 2**: Platform server (HSM-protected)
 * - **Share 3**: Recovery service (cold storage)
 *
 * ## Security Features
 *
 * | Feature | Implementation |
 * |---------|----------------|
 * | Key Security | No single point of failure |
 * | Transaction Signing | Requires 2 of 3 shares |
 * | Rate Limiting | Daily withdrawal limits |
 * | Fraud Prevention | Platform co-signing |
 * | Account Recovery | Via recovery share |
 *
 * ## Balance Types
 *
 * ```
 * Total Balance = Available Balance + Locked Balance
 *
 * Available: Can be used for entry fees or withdrawn
 * Locked: Reserved for active matches/tournaments
 * ```
 *
 * ## Withdrawal Limits
 *
 * | Tier | Daily Limit | Cooldown |
 * |------|-------------|----------|
 * | Basic | 10 SOL | 1 hour between |
 * | Verified | 50 SOL | 30 minutes |
 * | Premium | 200 SOL | None |
 *
 * @see WalletTransaction - Transaction history
 * @see [docs/diagrams/08-mpc.md](docs/diagrams/08-mpc.md) - MPC Implementation
 */
@Entity('esports_player_wallets')
@Index(['playerId'], { unique: true })
@Index(['publicKey'])
export class PlayerWallet {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Player's unique identifier (one wallet per player) */
  @Column({ unique: true })
  playerId: string;

  /** MPC wallet identifier in threshold signing system */
  @Column()
  mpcWalletId: string;

  /** Solana public key derived from MPC shares */
  @Column()
  publicKey: string;

  /**
   * Available balance in lamports
   * Can be used for entry fees or withdrawals
   */
  @Column({ type: 'bigint', default: '0' })
  availableBalance: string;

  /**
   * Locked balance in lamports
   * Reserved for active matches/tournaments
   */
  @Column({ type: 'bigint', default: '0' })
  lockedBalance: string;

  /** Lifetime total deposited (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalDeposited: string;

  /** Lifetime total withdrawn (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalWithdrawn: string;

  /** Lifetime total winnings (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalWinnings: string;

  /** Lifetime total entry fees paid (for analytics) */
  @Column({ type: 'bigint', default: '0' })
  totalEntryFees: string;

  /**
   * Current wallet status
   * @see PlayerWalletStatus
   */
  @Column({
    type: 'enum',
    enum: PlayerWalletStatus,
    default: PlayerWalletStatus.CREATING,
  })
  status: PlayerWalletStatus;

  /** Amount withdrawn today (for rate limiting) */
  @Column({ type: 'bigint', default: '0' })
  dailyWithdrawalAmount: string;

  /** When daily withdrawal counter resets */
  @Column({ type: 'timestamp', nullable: true })
  dailyWithdrawalResetAt: Date;

  /** Last withdrawal timestamp (for cooldown) */
  @Column({ type: 'timestamp', nullable: true })
  lastWithdrawalAt: Date;

  /**
   * Wallet metadata
   * @property displayName - Player display name
   * @property email - Contact email
   * @property kycVerified - KYC completion status
   * @property withdrawalAddresses - Whitelisted withdrawal addresses
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    displayName?: string;
    email?: string;
    kycVerified?: boolean;
    withdrawalAddresses?: string[];
  };

  /** Transaction history */
  @OneToMany(() => WalletTransaction, (tx) => tx.wallet, { cascade: true })
  transactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // ==================== Helper Methods ====================

  /**
   * Check if wallet is operational
   * @returns true if wallet status is ACTIVE
   */
  isActive(): boolean {
    return this.status === PlayerWalletStatus.ACTIVE;
  }

  /**
   * Get total balance (available + locked)
   * @returns total balance as bigint
   */
  getTotalBalance(): bigint {
    return BigInt(this.availableBalance) + BigInt(this.lockedBalance);
  }

  /**
   * Check if withdrawal is possible
   * @param amount - Amount to withdraw in lamports
   * @returns true if active and sufficient available balance
   */
  canWithdraw(amount: bigint): boolean {
    return this.isActive() && BigInt(this.availableBalance) >= amount;
  }

  /**
   * Check if funds can be locked for escrow
   * @param amount - Amount to lock in lamports
   * @returns true if active and sufficient available balance
   */
  canLock(amount: bigint): boolean {
    return this.isActive() && BigInt(this.availableBalance) >= amount;
  }
}

/**
 * # Wallet Transaction Entity
 *
 * Audit log for all wallet transactions.
 *
 * ## Overview
 *
 * Immutable record of every financial operation:
 * - Deposits and withdrawals
 * - Entry fee payments
 * - Prize distributions
 * - Refunds
 *
 * ## Transaction Flow
 *
 * ```
 * 1. Transaction created (PENDING)
 * 2. Processing begins (PROCESSING)
 *    - For withdrawals: MPC signing initiated
 *    - For deposits: On-chain verification
 * 3. Transaction completed (COMPLETED/FAILED)
 * ```
 *
 * ## Audit Requirements
 *
 * All transactions include:
 * - Unique ID for tracking
 * - Solana transaction signature (when applicable)
 * - Reference to source (match/tournament ID)
 * - Failure reason if unsuccessful
 *
 * @see PlayerWallet - Parent wallet entity
 */
@Entity('esports_wallet_transactions')
@Index(['walletId', 'createdAt'])
@Index(['type', 'status'])
@Index(['reference'])
export class WalletTransaction {
  /** Unique internal identifier (UUID) */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Reference to parent wallet */
  @Column()
  walletId: string;

  /** Parent wallet relation */
  @Column(() => PlayerWallet)
  wallet: PlayerWallet;

  /**
   * Transaction type
   * @see WalletTransactionType
   */
  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  type: WalletTransactionType;

  /** Transaction amount in lamports */
  @Column({ type: 'bigint' })
  amount: string;

  /** Solana transaction signature (for on-chain operations) */
  @Column({ nullable: true })
  signature: string;

  /** Reference ID (matchId, tournamentId, etc.) */
  @Column({ nullable: true })
  reference: string;

  /**
   * Transaction status
   * @see WalletTransactionStatus
   */
  @Column({
    type: 'enum',
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.PENDING,
  })
  status: WalletTransactionStatus;

  /** Error message if transaction failed */
  @Column({ type: 'text', nullable: true })
  failureReason: string;

  /**
   * Transaction metadata
   * @property fromAddress - Source Solana address
   * @property toAddress - Destination Solana address
   * @property matchId - Associated match ID
   * @property tournamentId - Associated tournament ID
   * @property feeAmount - Platform fee deducted
   * @property netAmount - Amount after fees
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    fromAddress?: string;
    toAddress?: string;
    matchId?: string;
    tournamentId?: string;
    feeAmount?: string;
    netAmount?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
