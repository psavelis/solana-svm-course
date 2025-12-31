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

export enum PositionType {
  SUPPLY = "supply",
  BORROW = "borrow",
}

export enum PositionStatus {
  ACTIVE = "active",
  LIQUIDATED = "liquidated",
  CLOSED = "closed",
}

@Entity("lending_positions")
export class LendingPosition {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  poolId: string;

  @ManyToOne(() => LendingPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: LendingPool;

  @Column()
  userAddress: string;

  @Column({ enum: PositionType })
  positionType: PositionType;

  @Column()
  assetMint: string;

  @Column("decimal", { precision: 36, scale: 9 })
  amount: number;

  @Column("decimal", { precision: 36, scale: 9, nullable: true })
  accruedInterest: number;

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  apy: number; // Annual Percentage Yield

  @Column({ enum: PositionStatus, default: PositionStatus.ACTIVE })
  status: PositionStatus;

  @Column({ nullable: true })
  obligationAddress: string; // Lending protocol obligation account

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  healthFactor: number; // For borrow positions

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  liquidationPrice: number;

  @Column("jsonb", { nullable: true })
  collateralInfo: {
    collateralMint: string;
    collateralAmount: number;
    collateralValue: number;
  }[];

  @Column({ nullable: true })
  lastUpdateSlot: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}