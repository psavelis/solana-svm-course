import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { DexSwap } from "./dex-swap.entity";
import { DexLiquidityPosition } from "./dex-liquidity-position.entity";

export enum DexType {
  AMM = "amm",
  ORDER_BOOK = "order_book",
  CLAMM = "clamm", // Concentrated Liquidity AMM
}

@Entity("dex_pools")
export class DexPool {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  poolAddress: string;

  @Column({ enum: DexType })
  dexType: DexType;

  @Column()
  dexProgramId: string;

  @Column()
  tokenAMint: string;

  @Column()
  tokenBMint: string;

  @Column("decimal", { precision: 36, scale: 9 })
  tokenABalance: number;

  @Column("decimal", { precision: 36, scale: 9 })
  tokenBBalance: number;

  @Column("decimal", { precision: 18, scale: 9, nullable: true })
  feeRate: number; // Fee rate in basis points (e.g., 30 = 0.3%)

  @Column({ nullable: true })
  ammAuthority: string;

  @Column({ nullable: true })
  poolTokenMint: string; // LP token mint address

  @Column("jsonb", { nullable: true })
  metadata: {
    name?: string;
    description?: string;
    tags?: string[];
    dexName?: string; // e.g., "Raydium", "Orca", "Serum"
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => DexSwap, (swap) => swap.pool)
  swaps: DexSwap[];

  @OneToMany(() => DexLiquidityPosition, (position) => position.pool)
  liquidityPositions: DexLiquidityPosition[];
}