import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";

export enum EventType {
  TRANSACTION_CONFIRMED = "transaction_confirmed",
  ACCOUNT_CHANGED = "account_changed",
  PROGRAM_LOG = "program_log",
  CPI_INVOCATION = "cpi_invocation",
  BLOCK_PRODUCED = "block_produced",
  SLOT_UPDATED = "slot_updated",
}

export enum EventStatus {
  PENDING = "pending",
  PROCESSED = "processed",
  FAILED = "failed",
}

@Entity("events")
@Index(["eventType"])
@Index(["source"])
@Index(["createdAt"])
export class Event {
  /**
   * unique identifier for the event
   * usage: internal database reference
   * example: "f6g7h8i9-j0k1-2l3m-4n5o-6p7q8r9s0t1u"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * type of the event
   * usage: categorizes events for filtering and processing
   * example: "transaction_confirmed"
   * reference: none
   */
  @Column({
    type: "enum",
    enum: EventType,
  })
  eventType: EventType;

  /**
   * source identifier related to the event
   * usage: links the event to a specific account, transaction, or program
   * example: "5K8q3s7T8U9V1W2X3Y4Z..."
   * reference: none
   */
  @Column({ type: "varchar", length: 88 })
  @Index()
  source: string; // Account, transaction, or program ID

  /**
   * structured data associated with the event
   * usage: provides event-specific details
   * example: { "amount": 100, "token": "usdc" }
   * reference: none
   */
  @Column({ type: "jsonb" })
  data: any; // Event-specific data

  /**
   * solana slot number where the event occurred
   * usage: temporal ordering and synchronization with the blockchain
   * example: 245678901
   * reference: https://solana.com/docs/core/slots
   */
  @Column({ type: "bigint", nullable: true })
  slot?: number; // Solana slot number

  /**
   * transaction signature associated with the event
   * usage: traceability to the on-chain transaction
   * example: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHir..."
   * reference: https://solana.com/docs/core/transactions#signature
   */
  @Column({ type: "varchar", nullable: true })
  signature?: string; // Transaction signature

  /**
   * processing status of the event
   * usage: tracks the lifecycle of event handling
   * example: "processed"
   * reference: none
   */
  @Column({
    type: "enum",
    enum: EventStatus,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  /**
   * error message if event processing failed
   * usage: debugging and error reporting
   * example: "connection timeout"
   * reference: none
   */
  @Column({ type: "text", nullable: true })
  errorMessage?: string;

  /**
   * timestamp when the event was recorded
   * usage: audit trail and time-based filtering
   * example: "2024-06-01T15:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the event record was last updated
   * usage: tracks updates to event status
   * example: "2024-06-01T15:00:05Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
