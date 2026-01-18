import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum PlayerWalletStatus {
  CREATING = 'creating',
  ACTIVE = 'active',
  LOCKED = 'locked',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum WalletTransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  ENTRY_FEE = 'entry_fee',
  PRIZE_WIN = 'prize_win',
  REFUND = 'refund',
  PLATFORM_FEE = 'platform_fee',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('esports_player_wallets')
@Index(['playerId'], { unique: true })
@Index(['publicKey'])
export class PlayerWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  playerId: string;

  @Column()
  mpcWalletId: string;

  @Column()
  publicKey: string;

  @Column({ type: 'bigint', default: '0' })
  availableBalance: string; // lamports

  @Column({ type: 'bigint', default: '0' })
  lockedBalance: string; // lamports (locked for active matches)

  @Column({ type: 'bigint', default: '0' })
  totalDeposited: string;

  @Column({ type: 'bigint', default: '0' })
  totalWithdrawn: string;

  @Column({ type: 'bigint', default: '0' })
  totalWinnings: string;

  @Column({ type: 'bigint', default: '0' })
  totalEntryFees: string;

  @Column({
    type: 'enum',
    enum: PlayerWalletStatus,
    default: PlayerWalletStatus.CREATING,
  })
  status: PlayerWalletStatus;

  @Column({ type: 'bigint', default: '0' })
  dailyWithdrawalAmount: string;

  @Column({ type: 'timestamp', nullable: true })
  dailyWithdrawalResetAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastWithdrawalAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    displayName?: string;
    email?: string;
    kycVerified?: boolean;
    withdrawalAddresses?: string[];
  };

  @OneToMany(() => WalletTransaction, (tx) => tx.wallet, { cascade: true })
  transactions: WalletTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === PlayerWalletStatus.ACTIVE;
  }

  getTotalBalance(): bigint {
    return BigInt(this.availableBalance) + BigInt(this.lockedBalance);
  }

  canWithdraw(amount: bigint): boolean {
    return this.isActive() && BigInt(this.availableBalance) >= amount;
  }

  canLock(amount: bigint): boolean {
    return this.isActive() && BigInt(this.availableBalance) >= amount;
  }
}

@Entity('esports_wallet_transactions')
@Index(['walletId', 'createdAt'])
@Index(['type', 'status'])
@Index(['reference'])
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @Column(() => PlayerWallet)
  wallet: PlayerWallet;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  type: WalletTransactionType;

  @Column({ type: 'bigint' })
  amount: string; // lamports

  @Column({ nullable: true })
  signature: string; // Solana transaction signature

  @Column({ nullable: true })
  reference: string; // matchId, tournamentId, etc.

  @Column({
    type: 'enum',
    enum: WalletTransactionStatus,
    default: WalletTransactionStatus.PENDING,
  })
  status: WalletTransactionStatus;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

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
