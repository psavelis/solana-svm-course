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

export enum PositionType {
  STANDARD = "standard",
  CONCENTRATED = "concentrated",
}

@Entity("dex_liquidity_positions")
export class DexLiquidityPosition {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  poolId: string;

  @ManyToOne(() => DexPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: DexPool;

  @Column()
  ownerAddress: string;

  @Column({ enum: PositionType })
  positionType: PositionType;

  @Column("decimal", { precision: 36, scale: 9 })
  tokenAAmount: number;

  @Column("decimal", { precision: 36, scale: 9 })
  tokenBAmount: number;

  @Column("decimal", { precision: 36, scale: 9 })
  liquidityShares: number; // LP tokens or shares

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  lowerPrice: number; // For concentrated liquidity

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  upperPrice: number; // For concentrated liquidity

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  feeEarnedA: number;

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  feeEarnedB: number;

  @Column({ nullable: true })
  positionNftMint: string; // For concentrated liquidity positions

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}