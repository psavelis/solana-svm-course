import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('accounts')
export class Account {
  /**
   * unique identifier for the account record in the local database
   * usage: internal reference for database operations
   * example: "123e4567-e89b-12d3-a456-426614174000"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * public key address of the account on the solana network
   * usage: identifies the account on-chain; used for sending transactions and querying state
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts#address
   */
  @Column({ unique: true })
  address: string;

  /**
   * address of the program that owns this account
   * usage: determines which program is allowed to write to this account's data
   * example: "11111111111111111111111111111111" (system program)
   * reference: https://solana.com/docs/core/accounts#ownership
   */
  @Column({ nullable: true })
  owner: string;

  /**
   * lamport balance of the account (1 sol = 1,000,000,000 lamports)
   * usage: used to pay for transaction fees and rent storage
   * example: 1000000000
   * reference: https://solana.com/docs/core/tokens#lamports
   */
  @Column({ type: 'bigint', default: 0 })
  balance: number;

  /**
   * flag indicating if this account is a program derived address (pda)
   * usage: used to determine if the account can sign via cpi
   * example: true
   * reference: https://solana.com/docs/core/pda
   */
  @Column({ default: false })
  isPda: boolean;

  /**
   * program id associated with this account (if executable or pda)
   * usage: links the account to its executable logic
   * example: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   * reference: https://solana.com/docs/core/programs
   */
  @Column({ nullable: true })
  programId: string;

  /**
   * additional metadata associated with the account
   * usage: stores arbitrary json data for indexing or application-specific logic
   * example: { "name": "my wallet", "tags": ["defi", "staking"] }
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * timestamp when the record was created
   * usage: audit trail for account creation
   * example: "2024-01-01T12:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the record was last updated
   * usage: tracks modifications to the account record
   * example: "2024-01-02T15:30:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
