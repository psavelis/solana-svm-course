import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { LendingPool } from "./lending-pool.entity";

/**
 * Position Type Enum
 * usage: distinguishes between supply (earning) and borrow (paying) positions
 * reference: https://docs.solend.fi/protocol/core-concepts
 */
export enum PositionType {
  SUPPLY = "supply",
  BORROW = "borrow",
}

/**
 * Position Status Enum
 * usage: tracks the lifecycle state of a lending position
 * reference: none
 */
export enum PositionStatus {
  ACTIVE = "active",
  LIQUIDATED = "liquidated",
  CLOSED = "closed",
}

/**
 * Lending Position Entity
 * 
 * Represents a user's supply or borrow position in a Solana lending protocol.
 * This entity tracks the user's assets, accrued interest, and health metrics.
 * 
 * Key position concepts:
 * - Supply Position: Assets deposited to earn interest (cTokens received)
 * - Borrow Position: Assets borrowed against collateral (obligation created)
 * - Health Factor: Ratio of collateral value to borrowed value
 * - Liquidation: When health factor drops below 1, position can be liquidated
 * 
 * Interest Accrual:
 * - Interest compounds continuously based on utilization rates
 * - APY changes dynamically based on pool utilization
 * 
 * @example
 * const position = new LendingPosition();
 * position.positionType = PositionType.SUPPLY;
 * position.assetMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
 * position.amount = 1000;
 * position.apy = 5.2;
 * 
 * @see https://docs.solend.fi/protocol/core-concepts#obligations
 * @see https://docs.solend.fi/protocol/core-concepts#liquidation
 */
@Entity("lending_positions")
export class LendingPosition {
  /**
   * unique identifier for the position record
   * usage: internal database reference
   * example: "b2c3d4e5-f6g7-8901-2345-678901bcdef0"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * id of the associated lending pool
   * usage: links the position to its parent pool
   * example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   * reference: https://typeorm.io/relations
   */
  @Column()
  poolId: string;

  /**
   * lending pool entity relation
   * usage: navigation to the parent pool
   * example: LendingPool object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => LendingPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: LendingPool;

  /**
   * wallet address of the position owner
   * usage: identifies the user who owns this position
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column()
  userAddress: string;

  /**
   * type of position (supply or borrow)
   * usage: determines interest direction (earning vs paying)
   * example: "supply"
   * reference: https://docs.solend.fi/protocol/core-concepts
   */
  @Column({ enum: PositionType })
  positionType: PositionType;

  /**
   * mint address of the asset
   * usage: identifies the token being supplied or borrowed
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" (usdc)
   * reference: https://spl.solana.com/token
   */
  @Column()
  assetMint: string;

  /**
   * principal amount in the position
   * usage: base amount before interest accrual
   * example: 1000.0
   * reference: none
   */
  @Column("decimal", { precision: 36, scale: 9 })
  amount: number;

  /**
   * accrued interest on the position
   * usage: earned (supply) or owed (borrow) interest
   * example: 52.5
   * reference: none
   */
  @Column("decimal", { precision: 36, scale: 9, nullable: true })
  accruedInterest: number;

  /**
   * current annual percentage yield
   * usage: interest rate for the position
   * example: 5.2
   * reference: https://docs.solend.fi/protocol/core-concepts#interest-rate-curve
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  apy: number; // Annual Percentage Yield

  /**
   * current status of the position
   * usage: tracks lifecycle state
   * example: "active"
   * reference: none
   */
  @Column({ enum: PositionStatus, default: PositionStatus.ACTIVE })
  status: PositionStatus;

  /**
   * on-chain obligation account address (for borrow positions)
   * usage: stores the protocol's obligation pda for this user
   * example: "3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m"
   * reference: https://docs.solend.fi/protocol/core-concepts#obligations
   */
  @Column({ nullable: true })
  obligationAddress: string; // Lending protocol obligation account

  /**
   * health factor for borrow positions (collateral/debt ratio)
   * usage: indicates risk level - below 1.0 triggers liquidation
   * example: 1.5
   * reference: https://docs.solend.fi/protocol/core-concepts#health-factor
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  healthFactor: number; // For borrow positions

  /**
   * price at which the position would be liquidated
   * usage: risk management and monitoring
   * example: 0.85
   * reference: https://docs.solend.fi/protocol/core-concepts#liquidation
   */
  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  liquidationPrice: number;

  /**
   * collateral details for borrow positions
   * usage: tracks assets backing the loan
   * example: [{ collateralMint: "So11...", collateralAmount: 10, collateralValue: 1500 }]
   * reference: https://docs.solend.fi/protocol/core-concepts#collateral
   */
  @Column("jsonb", { nullable: true })
  collateralInfo: {
    collateralMint: string;
    collateralAmount: number;
    collateralValue: number;
  }[];

  /**
   * solana slot of the last position update
   * usage: tracks freshness of position data
   * example: 245678901
   * reference: https://solana.com/docs/terminology#slot
   */
  @Column({ nullable: true })
  lastUpdateSlot: number;

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
   * usage: tracks state changes and interest updates
   * example: "2024-01-02T00:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}