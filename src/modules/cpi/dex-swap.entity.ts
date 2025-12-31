import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { DexPool } from "./dex-pool.entity";

export enum SwapDirection {
  A_TO_B = "a_to_b",
  B_TO_A = "b_to_a",
}

@Entity("dex_swaps")
export class DexSwap {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  transactionSignature: string;

  @Column()
  poolId: string;

  @ManyToOne(() => DexPool, { onDelete: "CASCADE" })
  @JoinColumn({ name: "poolId" })
  pool: DexPool;

  @Column()
  userAddress: string;

  @Column({ enum: SwapDirection })
  direction: SwapDirection;

  @Column("decimal", { precision: 36, scale: 9 })
  amountIn: number;

  @Column("decimal", { precision: 36, scale: 9 })
  amountOut: number;

  @Column("decimal", { precision: 36, scale: 9 })
  feeAmount: number;

  @Column("decimal", { precision: 18, scale: 9 })
  priceImpact: number; // Price impact percentage

  @Column("decimal", { precision: 18, scale: 9 })
  slippage: number; // Applied slippage tolerance

  @Column({ nullable: true })
  minimumAmountOut: number; // Minimum amount out for slippage protection

  @Column("jsonb", { nullable: true })
  route: {
    hops?: string[]; // For multi-hop swaps
    protocols?: string[]; // Protocols used in the route
  };

  @Column({ default: "confirmed" })
  status: string;

  @Column("int", { nullable: true })
  slot: number;

  @Column("bigint", { nullable: true })
  blockTime: number;

  @CreateDateColumn()
  createdAt: Date;
}