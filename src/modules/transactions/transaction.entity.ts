import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Transaction Status Enum
 * usage: tracks the lifecycle state of a solana transaction
 * reference: https://solana.com/docs/core/transactions#transaction-confirmation
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Transaction Type Enum
 * usage: categorizes different types of solana transactions for filtering and analytics
 * reference: https://solana.com/docs/core/transactions
 */
export enum TransactionType {
  TRANSFER = 'transfer',
  TOKEN_TRANSFER = 'token_transfer',
  PROGRAM_INTERACTION = 'program_interaction',
  ACCOUNT_CREATION = 'account_creation',
}

/**
 * Transaction Entity
 *
 * Represents a Solana blockchain transaction. Transactions in Solana are atomic units
 * of execution that contain one or more instructions. Each transaction must be signed
 * by the fee payer and any accounts whose data is modified.
 *
 * Key Solana transaction concepts:
 * - Transactions are atomic: all instructions succeed or all fail
 * - Each transaction has a unique 64-byte signature
 * - Transactions reference recent blockhashes for expiration (typically ~2 minutes)
 * - Fee is calculated based on compute units used and priority fee
 *
 * @example
 * const tx = new Transaction();
 * tx.signature = "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirW...";
 * tx.type = TransactionType.TRANSFER;
 * tx.fromAddress = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
 * tx.amount = 1000000000; // 1 SOL in lamports
 *
 * @see https://solana.com/docs/core/transactions
 * @see https://solana.com/docs/core/fees
 */
@Entity('transactions')
export class Transaction {
  /**
   * unique identifier for the transaction record
   * usage: internal database reference for indexing and relations
   * example: "550e8400-e29b-41d4-a716-446655440000"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * unique transaction signature (64 bytes base58 encoded)
   * usage: identifies the transaction on the solana blockchain, used for lookup and verification
   * example: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirW..."
   * reference: https://solana.com/docs/core/transactions#signature
   */
  @Column({ unique: true })
  signature: string;

  /**
   * type of transaction
   * usage: categorizes the transaction for filtering, analytics, and display
   * example: "transfer"
   * reference: https://solana.com/docs/core/transactions
   */
  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  /**
   * current transaction status
   * usage: tracks confirmation state - pending means submitted, confirmed means finalized
   * example: "confirmed"
   * reference: https://solana.com/docs/core/transactions#transaction-confirmation
   */
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  /**
   * source account address (fee payer or sender)
   * usage: identifies the account initiating the transaction or paying fees
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ nullable: true })
  fromAddress: string;

  /**
   * destination account address
   * usage: identifies the recipient in transfer transactions
   * example: "9noXzpXnkyEcKF3D5gejWb6BoM4T2fqCRDTnuLZKGzX5"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ nullable: true })
  toAddress: string;

  /**
   * transaction amount in lamports (1 SOL = 1,000,000,000 lamports)
   * usage: represents the value transferred in native SOL
   * example: 1000000000 (1 SOL)
   * reference: https://solana.com/docs/terminology#lamport
   */
  @Column({ type: 'bigint', default: 0 })
  amount: number;

  /**
   * transaction fee in lamports
   * usage: network fee paid to validators for processing the transaction
   * example: 5000 (0.000005 SOL base fee)
   * reference: https://solana.com/docs/core/fees
   */
  @Column({ type: 'bigint', nullable: true })
  fee: number;

  /**
   * slot number where the transaction was processed
   * usage: provides temporal ordering on the blockchain (~400ms per slot)
   * example: 245678901
   * reference: https://solana.com/docs/terminology#slot
   */
  @Column({ type: 'int', nullable: true })
  slot: number;

  /**
   * block timestamp when the transaction was confirmed
   * usage: human-readable time reference for the transaction
   * example: "2024-01-15T10:30:00Z"
   * reference: https://solana.com/docs/core/transactions
   */
  @Column({ type: 'timestamp', nullable: true })
  blockTime: Date;

  /**
   * array of instructions included in the transaction
   * usage: stores the detailed instruction data for each program invocation
   * example: [{ programId: "11111111111111111111111111111111", data: "...", accounts: [...] }]
   * reference: https://solana.com/docs/core/transactions#instructions
   */
  @Column({ type: 'jsonb', nullable: true })
  instructions: any[];

  /**
   * additional metadata associated with the transaction
   * usage: stores application-specific data, logs, or annotations
   * example: { "memo": "Payment for services", "orderId": "12345" }
   * reference: none
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * timestamp when the transaction record was created
   * usage: audit trail for when the transaction was first recorded locally
   * example: "2024-01-15T10:30:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the transaction record was last updated
   * usage: tracks status changes and metadata updates
   * example: "2024-01-15T10:30:05Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
