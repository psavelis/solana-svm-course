import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tokens')
export class Token {
  /**
   * unique identifier for the token record in the database
   * usage: internal reference for token management
   * example: "550e8400-e29b-41d4-a716-446655440000"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * public key address of the token mint
   * usage: uniquely identifies the token on the solana blockchain
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" (usdc)
   * reference: https://spl.solana.com/token#creating-a-new-token-type
   */
  @Column({ unique: true })
  mintAddress: string;

  /**
   * human-readable name of the token
   * usage: display purposes in uis and wallets
   * example: "usd coin"
   * reference: https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Column()
  name: string;

  /**
   * ticker symbol of the token
   * usage: concise representation of the token
   * example: "usdc"
   * reference: https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Column()
  symbol: string;

  /**
   * number of decimal places for the token
   * usage: determines the smallest indivisible unit (1 token = 10^decimals base units)
   * example: 6 (for usdc), 9 (for sol)
   * reference: https://spl.solana.com/token#creating-a-new-token-type
   */
  @Column({ type: 'int' })
  decimals: number;

  /**
   * total supply of the token
   * usage: tracks the total amount of tokens in circulation
   * example: "1000000000"
   * reference: https://spl.solana.com/token#supply
   */
  @Column({ nullable: true })
  supply: string;

  /**
   * address of the mint authority
   * usage: controls who can mint new tokens
   * example: "2wmVCSfPxGPjrnMMn7rchp4uaeoTqN39mXFC2zhPdri9"
   * reference: https://spl.solana.com/token#authority-types
   */
  @Column({ nullable: true })
  owner: string;

  /**
   * flag indicating if this token is a non-fungible token (nft)
   * usage: differentiates between fungible tokens and nfts (supply = 1, decimals = 0)
   * example: false
   * reference: https://docs.metaplex.com/programs/token-metadata/overview
   */
  @Column({ default: false })
  isNft: boolean;

  /**
   * additional metadata for the token
   * usage: stores off-chain or additional on-chain metadata links (uri, etc.)
   * example: { "uri": "https://example.com/metadata.json", "seller_fee_basis_points": 500 }
   * reference: https://docs.metaplex.com/programs/token-metadata/accounts
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  /**
   * timestamp when the token record was created
   * usage: audit trail for token registration
   * example: "2024-01-01T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the token record was last updated
   * usage: tracks updates to token details
   * example: "2024-02-15T14:20:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
