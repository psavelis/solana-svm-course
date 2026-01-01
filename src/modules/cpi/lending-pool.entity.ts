import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { LendingPosition } from "./lending-position.entity";

/**
 * Lending Pool Type Enum
 * usage: differentiates between standard and isolated risk pools
 * reference: https://docs.solend.fi/protocol/core-concepts
 */
export enum LendingPoolType {
  STANDARD = "standard",
  ISOLATED = "isolated",
}

/**
 * Lending Pool Entity
 * 
 * Represents a DeFi lending pool on Solana. Lending protocols like Solend, MarginFi,
 * and Kamino allow users to supply assets to earn interest or borrow against collateral.
 * This entity models the pool's state and configuration.
 * 
 * Key lending pool concepts:
 * - Reserves: Individual asset markets within the pool
 * - Supply APY: Interest rate earned by lenders
 * - Borrow APY: Interest rate paid by borrowers  
 * - Utilization Rate: Percentage of deposited assets currently borrowed
 * - LTV Ratio: Maximum loan-to-value for borrowing
 * - Liquidation Threshold: Collateral ratio that triggers liquidation
 * 
 * CPI Integration:
 * Lending protocols are commonly invoked via Cross-Program Invocation (CPI)
 * to enable composable DeFi strategies like leveraged yield farming.
 * 
 * @example
 * const pool = new LendingPool();
 * pool.poolAddress = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
 * pool.poolType = LendingPoolType.STANDARD;
 * pool.lendingProgramId = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
 * 
 * @see https://docs.solend.fi/
 * @see https://solana.com/docs/core/cpi
 */
@Entity("lending_pools")
export class LendingPool {
  /**
   * unique identifier for the lending pool record
   * usage: internal database reference
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * on-chain address of the lending pool
   * usage: identifies the pool on the solana blockchain
   * example: "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo"
   * reference: https://docs.solend.fi/protocol/addresses
   */
  @Column({ unique: true })
  poolAddress: string;

  /**
   * type of lending pool (standard or isolated)
   * usage: determines risk parameters and asset eligibility
   * example: "standard"
   * reference: https://docs.solend.fi/protocol/core-concepts
   */
  @Column({ enum: LendingPoolType })
  poolType: LendingPoolType;

  /**
   * program id of the lending protocol
   * usage: identifies which program manages this pool via cpi
   * example: "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo"
   * reference: https://solana.com/docs/core/cpi
   */
  @Column()
  lendingProgramId: string;

  /**
   * owner address of the pool (typically the protocol governance)
   * usage: controls pool parameters and upgrades
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column()
  ownerAddress: string;

  /**
   * array of asset reserves in the pool
   * usage: tracks individual market states for each supported asset
   * example: [{ assetMint: "EPjFWdd5...", supplyAPY: 5.2, borrowAPY: 8.1, ltvRatio: 0.75 }]
   * reference: https://docs.solend.fi/protocol/core-concepts#reserves
   */
  @Column("jsonb")
  reserves: {
    assetMint: string;
    reserveAddress: string;
    liquiditySupply: number;
    liquidityBorrowed: number;
    supplyAPY: number;
    borrowAPY: number;
    utilizationRate: number;
    ltvRatio: number; // Loan-to-Value ratio
    liquidationThreshold: number;
  }[];

  /**
   * total value locked in the pool (in usd)
   * usage: key metric for pool health and protocol adoption
   * example: 150000000.50
   * reference: https://defillama.com/
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  totalValueLocked: number;

  /**
   * program id of the price oracle
   * usage: provides real-time price feeds for collateral valuation
   * example: "gSbePebfvPy7tRqimPoVecS2UsBvYv46ynrzWocc92s"
   * reference: https://pyth.network/
   */
  @Column({ nullable: true })
  oracleProgramId: string; // Price oracle program

  /**
   * additional pool metadata
   * usage: stores display name, description, and protocol branding
   * example: { "name": "Main Pool", "protocolName": "Solend" }
   * reference: none
   */
  @Column("jsonb", { nullable: true })
  metadata: {
    name?: string;
    description?: string;
    website?: string;
    protocolName?: string; // e.g., "Solend", "Port Finance"
  };

  /**
   * indicates if the pool is currently active
   * usage: controls whether new deposits/borrows are allowed
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
   * usage: tracks reserve state updates
   * example: "2024-01-01T00:00:05Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * user positions in this lending pool
   * usage: navigation to supply/borrow positions
   * example: [LendingPosition, LendingPosition]
   * reference: https://typeorm.io/one-to-many-relation
   */
  @OneToMany(() => LendingPosition, (position) => position.pool)
  positions: LendingPosition[];
}