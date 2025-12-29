import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

export enum TransactionType {
  TRANSFER = "transfer",
  TOKEN_TRANSFER = "token_transfer",
  PROGRAM_INTERACTION = "program_interaction",
  ACCOUNT_CREATION = "account_creation",
}

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  signature: string;

  @Column({ type: "enum", enum: TransactionType })
  type: TransactionType;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ nullable: true })
  fromAddress: string;

  @Column({ nullable: true })
  toAddress: string;

  @Column({ type: "bigint", default: 0 })
  amount: number;

  @Column({ type: "bigint", nullable: true })
  fee: number;

  @Column({ type: "int", nullable: true })
  slot: number;

  @Column({ type: "timestamp", nullable: true })
  blockTime: Date;

  @Column({ type: "jsonb", nullable: true })
  instructions: any[];

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
