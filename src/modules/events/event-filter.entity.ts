import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

/**
 * Filter Type Enum
 * usage: categorizes the type of blockchain data being filtered
 * reference: https://solana.com/docs/rpc/websocket
 */
export enum FilterType {
  ACCOUNT = "account",
  PROGRAM = "program",
  TRANSACTION = "transaction",
  SLOT = "slot",
  BLOCK = "block",
}

/**
 * Filter Status Enum
 * usage: controls whether the filter is currently active
 * reference: none
 */
export enum FilterStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

/**
 * Event Filter Entity
 * 
 * Represents a configurable filter for Solana blockchain events. Filters allow users
 * to subscribe to specific types of on-chain activity based on criteria like account
 * addresses, program IDs, or custom data patterns.
 * 
 * Key filtering concepts:
 * - Account filters: Monitor changes to specific account data
 * - Program filters: Track all instructions sent to a program
 * - Transaction filters: Watch for transactions matching criteria
 * - Slot/Block filters: Monitor chain progression
 * 
 * @example
 * const filter = new EventFilter();
 * filter.filterType = FilterType.ACCOUNT;
 * filter.accountId = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
 * filter.criteria = { minBalance: 1000000000 };
 * 
 * @see https://solana.com/docs/rpc/websocket/accountSubscribe
 * @see https://solana.com/docs/rpc/websocket/programSubscribe
 */
@Entity("event_filters")
@Index(["filterType"])
@Index(["ownerId"])
@Index(["status"])
export class EventFilter {
  /**
   * unique identifier for the event filter
   * usage: internal database reference
   * example: "c3d4e5f6-g7h8-9012-3456-789012abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * identifier of the user or client owning this filter
   * usage: associates the filter with its creator for access control
   * example: "user_12345"
   * reference: none
   */
  @Column({ type: "varchar", length: 255 })
  @Index()
  ownerId: string; // User or client that owns this filter

  /**
   * type of blockchain data this filter monitors
   * usage: determines how the filter criteria is applied
   * example: "account"
   * reference: https://solana.com/docs/rpc/websocket
   */
  @Column({
    type: "enum",
    enum: FilterType,
  })
  filterType: FilterType;

  /**
   * specific account address to filter (for account filters)
   * usage: monitors changes to this specific account
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/rpc/websocket/accountSubscribe
   */
  @Column({ type: "varchar", length: 88, nullable: true })
  accountId?: string; // For account-specific filters

  /**
   * specific program address to filter (for program filters)
   * usage: monitors all instructions sent to this program
   * example: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   * reference: https://solana.com/docs/rpc/websocket/programSubscribe
   */
  @Column({ type: "varchar", length: 88, nullable: true })
  programId?: string; // For program-specific filters

  /**
   * custom filter criteria as json
   * usage: defines additional conditions for matching events
   * example: { "minAmount": 1000, "tokenMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
   * reference: none
   */
  @Column({ type: "jsonb" })
  criteria: any; // Filter criteria (e.g., { minAmount: 1000, tokenMint: '...' })

  /**
   * human-readable name for the filter
   * usage: helps users identify and manage their filters
   * example: "large usdc transfers"
   * reference: none
   */
  @Column({ type: "varchar", length: 255, nullable: true })
  name?: string; // Human-readable name

  /**
   * detailed description of the filter's purpose
   * usage: provides context about what the filter monitors
   * example: "alerts when usdc transfers exceed 10,000 usdc"
   * reference: none
   */
  @Column({ type: "text", nullable: true })
  description?: string;

  /**
   * current status of the filter
   * usage: controls whether events are matched against this filter
   * example: "active"
   * reference: none
   */
  @Column({
    type: "enum",
    enum: FilterStatus,
    default: FilterStatus.ACTIVE,
  })
  status: FilterStatus;

  /**
   * whether the filter is publicly accessible
   * usage: allows sharing filters between users
   * example: false
   * reference: none
   */
  @Column({ type: "boolean", default: false })
  isPublic: boolean; // Whether other users can use this filter

  /**
   * timestamp when the filter was created
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the filter was last updated
   * usage: tracks modifications to filter criteria
   * example: "2024-01-16T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
