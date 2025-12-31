import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { LendingPosition } from "./lending-position.entity";

export enum LendingPoolType {
  STANDARD = "standard",
  ISOLATED = "isolated",
}

@Entity("lending_pools")
export class LendingPool {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  poolAddress: string;

  @Column({ enum: LendingPoolType })
  poolType: LendingPoolType;

  @Column()
  lendingProgramId: string;

  @Column()
  ownerAddress: string;

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

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  totalValueLocked: number;

  @Column({ nullable: true })
  oracleProgramId: string; // Price oracle program

  @Column("jsonb", { nullable: true })
  metadata: {
    name?: string;
    description?: string;
    website?: string;
    protocolName?: string; // e.g., "Solend", "Port Finance"
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => LendingPosition, (position) => position.pool)
  positions: LendingPosition[];
}