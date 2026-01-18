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

export enum MatchStatus {
  CREATED = 'created',
  WAITING = 'waiting',
  READY = 'ready',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
  SETTLED = 'settled',
}

export enum GameType {
  DUEL = 'duel',
  TEAM_VS_TEAM = 'team_vs_team',
  FREE_FOR_ALL = 'free_for_all',
  BATTLE_ROYALE = 'battle_royale',
}

@Entity('esports_matches')
@Index(['status', 'gameType'])
@Index(['scheduledAt'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  matchId: string;

  @Column({
    type: 'enum',
    enum: GameType,
    default: GameType.DUEL,
  })
  gameType: GameType;

  @Column({ type: 'bigint' })
  entryFee: string; // lamports

  @Column({ type: 'int', default: 2 })
  minPlayers: number;

  @Column({ type: 'int', default: 2 })
  maxPlayers: number;

  @Column({ type: 'bigint', default: '0' })
  prizePool: string; // lamports

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.CREATED,
  })
  status: MatchStatus;

  @Column({ nullable: true })
  winnerId: string;

  @Column({ nullable: true })
  escrowAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    gameName?: string;
    gameMode?: string;
    region?: string;
    skillBracket?: string;
    rules?: Record<string, unknown>;
  };

  @Column({ type: 'jsonb', nullable: true })
  result: {
    winnerIds?: string[];
    scores?: Record<string, number>;
    proof?: string;
    submittedBy?: string;
    verifiedAt?: Date;
  };

  @OneToMany(() => MatchParticipant, (participant) => participant.match, {
    cascade: true,
  })
  participants: MatchParticipant[];

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isJoinable(): boolean {
    return (
      [MatchStatus.CREATED, MatchStatus.WAITING].includes(this.status) &&
      (this.participants?.length ?? 0) < this.maxPlayers
    );
  }

  isReady(): boolean {
    return (this.participants?.length ?? 0) >= this.minPlayers;
  }

  canStart(): boolean {
    return this.status === MatchStatus.READY && this.isReady();
  }

  getCurrentPlayerCount(): number {
    return this.participants?.filter((p) => p.status === ParticipantStatus.JOINED).length ?? 0;
  }
}

export enum ParticipantStatus {
  PENDING = 'pending',
  JOINED = 'joined',
  READY = 'ready',
  PLAYING = 'playing',
  FINISHED = 'finished',
  DISQUALIFIED = 'disqualified',
  WITHDRAWN = 'withdrawn',
}

@Entity('esports_match_participants')
@Index(['matchId', 'walletId'], { unique: true })
export class MatchParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  matchId: string;

  @ManyToOne(() => Match, (match) => match.participants)
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @Column()
  walletId: string;

  @Column()
  playerId: string;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  status: ParticipantStatus;

  @Column({ type: 'int', nullable: true })
  placement: number;

  @Column({ type: 'bigint', default: '0' })
  prizeWon: string;

  @Column({ nullable: true })
  entrySignature: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    teamId?: string;
    displayName?: string;
    avatar?: string;
    skillRating?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readyAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
