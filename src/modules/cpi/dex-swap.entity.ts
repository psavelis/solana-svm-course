import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DexPool } from "./dex-pool.entity";

/**
 * Swap Direction Enum
 * usage: indicates which token is being sold vs bought
 * reference: https://docs.raydium.io/raydium/swap/swap
 */
export enum SwapDirection {
  A_TO_B = "a_to_b",
  B_TO_A = "b_to_a",
}

/**
 * DEX Swap Entity
 * 
 * Represents a token swap execution on a Solana DEX. Swaps exchange one token
 * for another through a liquidity pool, with price determined by the pool's
 * mechanism (AMM curve, order book, etc.).
 * 
 * Key swap concepts:
 * - Price Impact: How much the trade moves the pool price
 * - Slippage: Difference between expected and executed price
 * - Minimum Amount Out: Slippage protection - transaction fails if not met
 * - Multi-hop: Routing through multiple pools for better prices
 * 
 * Swap Execution Flow:
 * 1. User specifies input token and amount
 * 2. DEX calculates output based on reserves and fees
 * 3. Slippage tolerance checked against minimum amount out
 * 4. Tokens transferred atomically via program instructions
 * 
 * Jupiter Aggregation:
 * For optimal prices, swaps often route through Jupiter aggregator which
 * finds the best path across multiple DEXs.
 * 
 * @example
 * const swap = new DexSwap();
 * swap.direction = SwapDirection.A_TO_B;
 * swap.amountIn = 1.5; // 1.5 SOL
 * swap.amountOut = 150.25; // ~150 USDC
 * swap.priceImpact = 0.05; // 0.05%
 * 
 * @see https://docs.raydium.io/raydium/swap
 * @see https://docs.jup.ag/
 */
@Entity("dex_swaps")
export class DexSwap {
  /**
   * unique identifier for the swap record
   * usage: internal database reference
   * example: "d4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * unique on-chain transaction signature
   * usage: identifies the swap transaction on the blockchain
   * example: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirW..."
   * reference: https://solana.com/docs/core/transactions#signature
   */
  @Column({ unique: true })
  transactionSignature: string;

  /**
   * id of the pool where the swap occurred
   * usage: links to the liquidity pool used
   * example: "c3d4e5f6-g7h8-9012-3456-789012abcdef"
   * reference: https://typeorm.io/relations
   */
  @Column()
  poolId: string;

  /**
   * dex pool entity relation
   * usage: navigation to the pool details
   * example: DexPool object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => DexPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: DexPool;

  /**
   * wallet address of the user who initiated the swap
   * usage: identifies the trader
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column()
  userAddress: string;

  /**
   * direction of the swap (which token is sold)
   * usage: determines input/output token based on pool pair
   * example: "a_to_b" (selling token a for token b)
   * reference: https://docs.raydium.io/raydium/swap
   */
  @Column({ enum: SwapDirection })
  direction: SwapDirection;

  /**
   * amount of input token swapped
   * usage: the quantity of tokens sold
   * example: 1.5
   * reference: none
   */
  @Column("decimal", { precision: 36, scale: 9 })
  amountIn: number;

  /**
   * amount of output token received
   * usage: the quantity of tokens received
   * example: 150.25
   * reference: none
   */
  @Column("decimal", { precision: 36, scale: 9 })
  amountOut: number;

  /**
   * fee amount charged for the swap
   * usage: fee paid to liquidity providers
   * example: 0.45
   * reference: https://docs.orca.so/orca-whirlpools/overview#fee-tiers
   */
  @Column("decimal", { precision: 36, scale: 9 })
  feeAmount: number;

  /**
   * price impact as a percentage
   * usage: measures how much the trade moved the pool price
   * example: 0.05 (0.05%)
   * reference: https://docs.jup.ag/notes/price-impact-and-route-selection
   */
  @Column("decimal", { precision: 18, scale: 9 })
  priceImpact: number; // Price impact percentage

  /**
   * slippage tolerance applied to the swap
   * usage: maximum acceptable price deviation
   * example: 0.5 (0.5%)
   * reference: https://docs.jup.ag/notes/price-impact-and-route-selection
   */
  @Column("decimal", { precision: 18, scale: 9 })
  slippage: number; // Applied slippage tolerance

  /**
   * minimum output amount for slippage protection
   * usage: transaction reverts if output is below this amount
   * example: 149.75
   * reference: https://docs.raydium.io/raydium/swap#slippage-tolerance
   */
  @Column({ nullable: true })
  minimumAmountOut: number; // Minimum amount out for slippage protection

  /**
   * routing information for multi-hop swaps
   * usage: records intermediate pools and protocols used
   * example: { hops: ["SOL→USDC", "USDC→RAY"], protocols: ["Orca", "Raydium"] }
   * reference: https://docs.jup.ag/
   */
  @Column("jsonb", { nullable: true })
  route: {
    hops?: string[]; // For multi-hop swaps
    protocols?: string[]; // Protocols used in the route
  };

  /**
   * transaction status
   * usage: confirmation state of the swap
   * example: "confirmed"
   * reference: https://solana.com/docs/core/transactions#transaction-confirmation
   */
  @Column({ default: "confirmed" })
  status: string;

  /**
   * solana slot where the swap was processed
   * usage: temporal ordering on the blockchain
   * example: 245678901
   * reference: https://solana.com/docs/terminology#slot
   */
  @Column("int", { nullable: true })
  slot: number;

  /**
   * unix timestamp of the block
   * usage: when the swap was finalized
   * example: 1705324800
   * reference: https://solana.com/docs/core/transactions
   */
  @Column("bigint", { nullable: true })
  blockTime: number;

  /**
   * timestamp when the swap record was created
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;
}