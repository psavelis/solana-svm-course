import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';

export enum EventType {
  TRANSACTION_CONFIRMED = 'transaction_confirmed',
  ACCOUNT_CHANGED = 'account_changed',
  PROGRAM_LOG = 'program_log',
  CPI_INVOCATION = 'cpi_invocation',
  BLOCK_PRODUCED = 'block_produced',
  SLOT_UPDATED = 'slot_updated',
}

export enum EventStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Entity('events')
@Index(['eventType'])
@Index(['source'])
@Index(['createdAt'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  eventType: EventType;

  @Column({ type: 'varchar', length: 88 })
  @Index()
  source: string; // Account, transaction, or program ID

  @Column({ type: 'jsonb' })
  data: any; // Event-specific data

  @Column({ type: 'bigint', nullable: true })
  slot?: number; // Solana slot number

  @Column({ type: 'varchar', nullable: true })
  signature?: string; // Transaction signature

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}