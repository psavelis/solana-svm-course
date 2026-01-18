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

export enum TournamentStatus {
  DRAFT = 'draft',
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed',
  BRACKET_GENERATED = 'bracket_generated',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum BracketType {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  SWISS = 'swiss',
}

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  ELIMINATED = 'eliminated',
  WITHDRAWN = 'withdrawn',
  DISQUALIFIED = 'disqualified',
}

@Entity('esports_tournaments')
@Index(['status'])
@Index(['registrationStart', 'registrationEnd'])
export class Tournament {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tournamentId: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  gameType: string;

  @Column({ type: 'bigint' })
  entryFee: string; // lamports

  @Column({ type: 'bigint', default: '0' })
  prizePool: string; // lamports

  @Column({ type: 'bigint', default: '0' })
  guaranteedPrizePool: string; // minimum guaranteed

  @Column({ type: 'int' })
  maxParticipants: number;

  @Column({ type: 'int', default: 2 })
  minParticipants: number;

  @Column({
    type: 'enum',
    enum: BracketType,
    default: BracketType.SINGLE_ELIMINATION,
  })
  bracketType: BracketType;

  @Column({
    type: 'enum',
    enum: TournamentStatus,
    default: TournamentStatus.DRAFT,
  })
  status: TournamentStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  platformFeePercent: number;

  @Column({ type: 'jsonb' })
  prizeStructure: {
    place: number;
    percentage: number;
    fixedAmount?: string;
  }[];

  @Column({ nullable: true })
  escrowAddress: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    region?: string;
    skillBracket?: string;
    rules?: string;
    streamUrl?: string;
    organizerId?: string;
  };

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

  @OneToMany(() => TournamentRegistration, (reg) => reg.tournament, {
    cascade: true,
  })
  registrations: TournamentRegistration[];

  @Column({ type: 'timestamp' })
  registrationStart: Date;

  @Column({ type: 'timestamp' })
  registrationEnd: Date;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isRegistrationOpen(): boolean {
    const now = new Date();
    return (
      this.status === TournamentStatus.REGISTRATION_OPEN &&
      now >= this.registrationStart &&
      now <= this.registrationEnd &&
      this.getCurrentParticipantCount() < this.maxParticipants
    );
  }

  getCurrentParticipantCount(): number {
    return (
      this.registrations?.filter(
        (r) =>
          r.status === RegistrationStatus.CONFIRMED || r.status === RegistrationStatus.CHECKED_IN,
      ).length ?? 0
    );
  }

  canGenerateBracket(): boolean {
    return (
      this.status === TournamentStatus.REGISTRATION_CLOSED &&
      this.getCurrentParticipantCount() >= this.minParticipants
    );
  }
}

@Entity('esports_tournament_registrations')
@Index(['tournamentId', 'walletId'], { unique: true })
export class TournamentRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tournamentId: string;

  @ManyToOne(() => Tournament, (tournament) => tournament.registrations)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @Column()
  walletId: string;

  @Column()
  playerId: string;

  @Column({ type: 'int', nullable: true })
  seed: number;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ nullable: true })
  paymentSignature: string;

  @Column({ type: 'int', nullable: true })
  finalPlacement: number;

  @Column({ type: 'bigint', default: '0' })
  prizeWon: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    teamName?: string;
    displayName?: string;
    skillRating?: number;
    checkInTime?: Date;
  };

  @Column({ type: 'timestamp' })
  registeredAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
