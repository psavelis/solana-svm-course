import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DexPool } from "./dex-pool.entity";

/**
 * Position Type Enum
 * usage: differentiates between standard amm and concentrated liquidity positions
 * reference: https://docs.orca.so/orca-whirlpools/overview
 */
export enum PositionType {
  STANDARD = "standard",
  CONCENTRATED = "concentrated",
}

/**
 * DEX Liquidity Position Entity
 * 
 * Represents a liquidity provider (LP) position in a DEX pool on Solana. Liquidity
 * providers deposit token pairs into pools and earn fees from swaps.
 * 
 * Key LP concepts:
 * - Standard LP: Full-range liquidity following xy=k curve
 * - Concentrated LP: Liquidity within specific price ranges (Whirlpools, etc.)
 * - LP Tokens: Represent share of pool, received when providing liquidity
 * - Impermanent Loss: Value difference vs holding, occurs when prices diverge
 * 
 * Concentrated Liquidity (CLAMM):
 * - Liquidity providers choose price ranges [lowerPrice, upperPrice]
 * - Higher capital efficiency within range
 * - Position represented as NFT in some protocols
 * - Fees only earned when price is within range
 * 
 * @example
 * const position = new DexLiquidityPosition();
 * position.positionType = PositionType.CONCENTRATED;
 * position.tokenAAmount = 10.5; // SOL
 * position.tokenBAmount = 1050.0; // USDC
 * position.lowerPrice = 95.0;
 * position.upperPrice = 105.0;
 * 
 * @see https://docs.orca.so/orca-whirlpools/overview
 * @see https://docs.raydium.io/raydium/concentrated-liquidity
 */
@Entity("dex_liquidity_positions")
export class DexLiquidityPosition {
  /**
   * unique identifier for the position record
   * usage: internal database reference
   * example: "e5f6g7h8-i9j0-1k2l-3m4n-5o6p7q8r9s0t"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * id of the pool where liquidity is provided
   * usage: links to the parent liquidity pool
   * example: "c3d4e5f6-g7h8-9012-3456-789012abcdef"
   * reference: https://typeorm.io/relations
   */
  @Column()
  poolId: string;

  /**
   * dex pool entity relation
   * usage: navigation to pool details
   * example: DexPool object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => DexPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: DexPool;

  /**
   * wallet address of the liquidity provider
   * usage: identifies the lp owner
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column()
  ownerAddress: string;

  /**
   * type of liquidity position
   * usage: determines fee earning mechanics and rebalancing needs
   * example: "concentrated"
   * reference: https://docs.orca.so/orca-whirlpools/overview
   */
  @Column({ enum: PositionType })
  positionType: PositionType;

  /**
   * amount of token a in the position
   * usage: current quantity of first token deposited
   * example: 10.5
   * reference: https://docs.raydium.io/raydium/pool/amm
   */
  @Column("decimal", { precision: 36, scale: 9 })
  tokenAAmount: number;

  /**
   * amount of token b in the position
   * usage: current quantity of second token deposited
   * example: 1050.0
   * reference: https://docs.raydium.io/raydium/pool/amm
   */
  @Column("decimal", { precision: 36, scale: 9 })
  tokenBAmount: number;

  /**
   * lp tokens or shares received
   * usage: represents proportional ownership of pool
   * example: 100.5
   * reference: https://docs.raydium.io/raydium/pool/amm#lp-tokens
   */
  @Column("decimal", { precision: 36, scale: 9 })
  liquidityShares: number; // LP tokens or shares

  /**
   * lower price bound (for concentrated liquidity)
   * usage: liquidity only active above this price
   * example: 95.0
   * reference: https://docs.orca.so/orca-whirlpools/overview#tick-ranges
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  lowerPrice: number; // For concentrated liquidity

  /**
   * upper price bound (for concentrated liquidity)
   * usage: liquidity only active below this price
   * example: 105.0
   * reference: https://docs.orca.so/orca-whirlpools/overview#tick-ranges
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  upperPrice: number; // For concentrated liquidity

  /**
   * accumulated fees earned in token a
   * usage: unclaimed fee rewards in first token
   * example: 0.5
   * reference: https://docs.orca.so/orca-whirlpools/liquidity-provision#collecting-fees
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  feeEarnedA: number;

  /**
   * accumulated fees earned in token b
   * usage: unclaimed fee rewards in second token
   * example: 50.0
   * reference: https://docs.orca.so/orca-whirlpools/liquidity-provision#collecting-fees
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  feeEarnedB: number;

  /**
   * nft mint address for concentrated liquidity positions
   * usage: some protocols represent clamm positions as nfts
   * example: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R"
   * reference: https://docs.orca.so/orca-whirlpools/overview#position-nfts
   */
  @Column({ nullable: true })
  positionNftMint: string; // For concentrated liquidity positions

  /**
   * indicates if the position is currently active
   * usage: controls whether fees are being earned
   * example: true
   * reference: none
   */
  @Column({ default: true })
  isActive: boolean;

  /**
   * timestamp when the position was created
   * usage: audit trail and duration calculations
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the position was last updated
   * usage: tracks deposits, withdrawals, and fee claims
   * example: "2024-01-15T00:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}