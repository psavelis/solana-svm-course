import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

export enum EscrowStatus {
  CREATED = 'created',
  ACTIVE = 'active',
  LOCKED = 'locked',
  RELEASING = 'releasing',
  RELEASED = 'released',
  REFUNDING = 'refunding',
  REFUNDED = 'refunded',
  CLOSED = 'closed',
}

export enum EscrowSourceType {
  MATCH = 'match',
  TOURNAMENT = 'tournament',
}

export enum EscrowTransactionType {
  DEPOSIT = 'deposit',
  RELEASE = 'release',
  REFUND = 'refund',
  PLATFORM_FEE = 'platform_fee',
}

@Entity('esports_escrow_accounts')
@Index(['sourceType', 'sourceId'])
@Index(['status'])
export class EscrowAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  escrowId: string;

  @Column()
  escrowAddress: string; // Solana PDA address

  @Column({
    type: 'enum',
    enum: EscrowSourceType,
  })
  sourceType: EscrowSourceType;

  @Column()
  sourceId: string; // matchId or tournamentId

  @Column({ type: 'bigint', default: '0' })
  totalDeposited: string;

  @Column({ type: 'bigint', default: '0' })
  totalReleased: string;

  @Column({ type: 'bigint', default: '0' })
  totalRefunded: string;

  @Column({ type: 'bigint', default: '0' })
  platformFeeCollected: string;

  @Column({ type: 'bigint', default: '0' })
  currentBalance: string;

  @Column({
    type: 'enum',
    enum: EscrowStatus,
    default: EscrowStatus.CREATED,
  })
  status: EscrowStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    createdBy?: string;
    lockedAt?: Date;
    releaseReason?: string;
    refundReason?: string;
  };

  @OneToMany(() => EscrowTransaction, (tx) => tx.escrow, { cascade: true })
  transactions: EscrowTransaction[];

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  closedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return [EscrowStatus.CREATED, EscrowStatus.ACTIVE].includes(this.status);
  }

  isLocked(): boolean {
    return this.status === EscrowStatus.LOCKED;
  }

  canDeposit(): boolean {
    return this.isActive();
  }

  canRelease(): boolean {
    return this.status === EscrowStatus.LOCKED && BigInt(this.currentBalance) > 0;
  }

  canRefund(): boolean {
    return (
      [EscrowStatus.ACTIVE, EscrowStatus.LOCKED].includes(this.status) &&
      BigInt(this.currentBalance) > 0
    );
  }
}

@Entity('esports_escrow_transactions')
@Index(['escrowId', 'createdAt'])
@Index(['participantWalletId'])
export class EscrowTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  escrowId: string;

  @Column(() => EscrowAccount)
  escrow: EscrowAccount;

  @Column({
    type: 'enum',
    enum: EscrowTransactionType,
  })
  type: EscrowTransactionType;

  @Column({ nullable: true })
  participantWalletId: string;

  @Column({ type: 'bigint' })
  amount: string;

  @Column({ nullable: true })
  signature: string; // Solana transaction signature

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
