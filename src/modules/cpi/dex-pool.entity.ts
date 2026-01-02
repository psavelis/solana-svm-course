import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { DexSwap } from './dex-swap.entity';
import { DexLiquidityPosition } from './dex-liquidity-position.entity';

/**
 * DEX Type Enum
 * usage: categorizes the trading mechanism used by the pool
 * reference: https://solana.com/ecosystem/dex
 */
export enum DexType {
  AMM = 'amm',
  ORDER_BOOK = 'order_book',
  CLAMM = 'clamm', // Concentrated Liquidity AMM
}

/**
 * DEX Pool Entity
 *
 * Represents a decentralized exchange liquidity pool on Solana. DEX pools enable
 * trustless token swaps using various mechanisms like AMMs (Automated Market Makers)
 * or order books.
 *
 * Key DEX concepts:
 * - AMM: Uses x*y=k formula to determine prices (e.g., Raydium, Orca)
 * - CLAMM: Concentrated Liquidity AMM allows LPs to provide liquidity in price ranges
 * - Order Book: Traditional order matching (e.g., Serum/OpenBook)
 *
 * Popular Solana DEXs:
 * - Raydium: Hybrid AMM with order book integration
 * - Orca: User-friendly AMM with Whirlpools (CLAMM)
 * - Jupiter: DEX aggregator for best prices across pools
 * - OpenBook: Decentralized order book (Serum fork)
 *
 * CPI Integration:
 * DEX pools are frequently called via CPI for composable swaps in DeFi protocols.
 *
 * @example
 * const pool = new DexPool();
 * pool.dexType = DexType.CLAMM;
 * pool.dexProgramId = "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc";
 * pool.tokenAMint = "So11111111111111111111111111111111111111112"; // SOL
 * pool.tokenBMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
 *
 * @see https://docs.raydium.io/
 * @see https://docs.orca.so/
 * @see https://solana.com/docs/core/cpi
 */
@Entity('dex_pools')
export class DexPool {
  /**
   * unique identifier for the pool record
   * usage: internal database reference
   * example: "c3d4e5f6-g7h8-9012-3456-789012abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * on-chain address of the liquidity pool
   * usage: identifies the pool on the solana blockchain
   * example: "HJPjoWUrhoZzkNfRpHuieeFk9WcZWjwy6PBjZ81ngndJ"
   * reference: https://docs.raydium.io/raydium/pool/amm
   */
  @Column({ unique: true })
  poolAddress: string;

  /**
   * type of dex mechanism used
   * usage: determines swap logic and liquidity provision rules
   * example: "clamm"
   * reference: https://docs.orca.so/orca-whirlpools/overview
   */
  @Column({ enum: DexType })
  dexType: DexType;

  /**
   * program id of the dex protocol
   * usage: identifies which program handles swaps via cpi
   * example: "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc"
   * reference: https://solana.com/docs/core/cpi
   */
  @Column()
  dexProgramId: string;

  /**
   * mint address of the first token in the pair
   * usage: identifies token a in the trading pair
   * example: "So11111111111111111111111111111111111111112" (wrapped sol)
   * reference: https://spl.solana.com/token
   */
  @Column()
  tokenAMint: string;

  /**
   * mint address of the second token in the pair
   * usage: identifies token b in the trading pair
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" (usdc)
   * reference: https://spl.solana.com/token
   */
  @Column()
  tokenBMint: string;

  /**
   * current balance of token a in the pool
   * usage: used for price calculations in amms (x*y=k)
   * example: 50000.123456789
   * reference: https://docs.raydium.io/raydium/pool/amm
   */
  @Column('decimal', { precision: 36, scale: 9 })
  tokenABalance: number;

  /**
   * current balance of token b in the pool
   * usage: used for price calculations in amms (x*y=k)
   * example: 5000000.123456789
   * reference: https://docs.raydium.io/raydium/pool/amm
   */
  @Column('decimal', { precision: 36, scale: 9 })
  tokenBBalance: number;

  /**
   * trading fee rate in basis points
   * usage: fee charged on each swap (30 = 0.3%)
   * example: 30
   * reference: https://docs.orca.so/orca-whirlpools/overview#fee-tiers
   */
  @Column('decimal', { precision: 18, scale: 9, nullable: true })
  feeRate: number; // Fee rate in basis points (e.g., 30 = 0.3%)

  /**
   * authority account for the amm
   * usage: pda that controls pool operations
   * example: "3n4bCQM8nKzDQfg8FNLsZ2u6JxZQPVvLKxJM8YvNFJqF"
   * reference: https://solana.com/docs/core/pda
   */
  @Column({ nullable: true })
  ammAuthority: string;

  /**
   * lp token mint address
   * usage: tokens received when providing liquidity
   * example: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
   * reference: https://docs.raydium.io/raydium/pool/amm#lp-tokens
   */
  @Column({ nullable: true })
  poolTokenMint: string; // LP token mint address

  /**
   * additional pool metadata
   * usage: stores display info and protocol branding
   * example: { "name": "SOL-USDC", "dexName": "Orca" }
   * reference: none
   */
  @Column('jsonb', { nullable: true })
  metadata: {
    name?: string;
    description?: string;
    tags?: string[];
    dexName?: string; // e.g., "Raydium", "Orca", "Serum"
  };

  /**
   * indicates if the pool is currently active
   * usage: controls whether swaps are allowed
   * example: true
   * reference: none
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * timestamp when the pool record was created
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the pool record was last updated
   * usage: tracks balance and state updates
   * example: "2024-01-01T00:00:05Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * swaps executed in this pool
   * usage: navigation to swap history
   * example: [DexSwap, DexSwap]
   * reference: https://typeorm.io/one-to-many-relation
   */
  @OneToMany(() => DexSwap, (swap) => swap.pool)
  swaps: DexSwap[];

  /**
   * liquidity positions in this pool
   * usage: navigation to lp positions
   * example: [DexLiquidityPosition, DexLiquidityPosition]
   * reference: https://typeorm.io/one-to-many-relation
   */
  @OneToMany(() => DexLiquidityPosition, (position) => position.pool)
  liquidityPositions: DexLiquidityPosition[];
}
