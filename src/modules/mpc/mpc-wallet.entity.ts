import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { KeyShare } from "./key-share.entity";

export enum MpcWalletStatus {
  CREATING = "creating",
  ACTIVE = "active",
  RECOVERING = "recovering",
  DISABLED = "disabled",
}

export enum ThresholdScheme {
  TSS_2_3 = "2-of-3", // 2 out of 3 shares needed
  TSS_3_5 = "3-of-5", // 3 out of 5 shares needed
  TSS_4_7 = "4-of-7", // 4 out of 7 shares needed
}

@Entity("mpc_wallets")
export class MpcWallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  walletId: string; // Public identifier for the wallet

  @Column()
  name: string; // Human-readable name

  @Column({
    type: "enum",
    enum: ThresholdScheme,
    default: ThresholdScheme.TSS_2_3,
  })
  thresholdScheme: ThresholdScheme;

  @Column()
  totalShares: number; // Total number of key shares

  @Column()
  threshold: number; // Minimum shares needed for signing

  @Column({ type: "text" })
  publicKey: string; // The combined public key

  @Column({
    type: "enum",
    enum: MpcWalletStatus,
    default: MpcWalletStatus.CREATING,
  })
  status: MpcWalletStatus;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    description?: string;
    tags?: string[];
    createdBy?: string;
  };

  @OneToMany(() => KeyShare, (keyShare) => keyShare.wallet, { cascade: true })
  keyShares: KeyShare[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === MpcWalletStatus.ACTIVE;
  }

  canSign(): boolean {
    return (
      this.keyShares &&
      this.keyShares.filter((share) => share.isActive()).length >=
        this.threshold
    );
  }

  getActiveSharesCount(): number {
    return this.keyShares
      ? this.keyShares.filter((share) => share.isActive()).length
      : 0;
  }
}
