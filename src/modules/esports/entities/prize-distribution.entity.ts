import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PrizeDistributionStatus {
  PENDING = 'pending',
  CALCULATING = 'calculating',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  FAILED = 'failed',
}

export enum PrizeSourceType {
  MATCH = 'match',
  TOURNAMENT = 'tournament',
}

@Entity('esports_prize_distributions')
@Index(['sourceType', 'sourceId'])
@Index(['status'])
export class PrizeDistribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: PrizeSourceType,
  })
  sourceType: PrizeSourceType;

  @Column()
  sourceId: string; // matchId or tournamentId

  @Column({ type: 'bigint' })
  totalPrizePool: string;

  @Column({ type: 'bigint' })
  platformFee: string;

  @Column({ type: 'bigint' })
  distributableAmount: string;

  @Column({ type: 'bigint', default: '0' })
  distributedAmount: string;

  @Column({
    type: 'enum',
    enum: PrizeDistributionStatus,
    default: PrizeDistributionStatus.PENDING,
  })
  status: PrizeDistributionStatus;

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

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    calculatedAt?: Date;
    processedBy?: string;
    retryCount?: number;
    lastError?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  distributedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getTotalDistributed(): bigint {
    return this.distributions
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + BigInt(d.amount), BigInt(0));
  }

  getPendingDistributions(): typeof this.distributions {
    return this.distributions.filter((d) => d.status === 'pending');
  }

  isFullyDistributed(): boolean {
    return this.distributions.every((d) => d.status === 'completed');
  }
}
