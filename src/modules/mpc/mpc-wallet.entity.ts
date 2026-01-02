import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { KeyShare } from './key-share.entity';

export enum MpcWalletStatus {
  CREATING = 'creating',
  ACTIVE = 'active',
  RECOVERING = 'recovering',
  DISABLED = 'disabled',
}

export enum ThresholdScheme {
  TSS_2_3 = '2-of-3', // 2 out of 3 shares needed
  TSS_3_5 = '3-of-5', // 3 out of 5 shares needed
  TSS_4_7 = '4-of-7', // 4 out of 7 shares needed
}

@Entity('mpc_wallets')
export class MpcWallet {
  /**
   * unique identifier for the mpc wallet entity
   * usage: internal database reference
   * example: "d4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * public identifier for the wallet
   * usage: external reference for api calls
   * example: "wallet_123456789"
   * reference: none
   */
  @Column({ unique: true })
  walletId: string; // Public identifier for the wallet

  /**
   * human-readable name of the wallet
   * usage: user identification in ui
   * example: "treasury vault"
   * reference: none
   */
  @Column()
  name: string; // Human-readable name

  /**
   * threshold scheme used for the mpc wallet
   * usage: defines the security model (e.g., 2-of-3)
   * example: "2-of-3"
   * reference: https://en.wikipedia.org/wiki/Threshold_cryptosystem
   */
  @Column({
    type: 'enum',
    enum: ThresholdScheme,
    default: ThresholdScheme.TSS_2_3,
  })
  thresholdScheme: ThresholdScheme;

  /**
   * total number of key shares generated
   * usage: part of the threshold scheme definition
   * example: 3
   * reference: https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing
   */
  @Column()
  totalShares: number; // Total number of key shares

  /**
   * minimum number of shares required to sign
   * usage: determines signing capability
   * example: 2
   * reference: https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing
   */
  @Column()
  threshold: number; // Minimum shares needed for signing

  /**
   * combined public key of the mpc wallet
   * usage: used to verify signatures produced by the wallet
   * example: "Awes4Tr6Tx8JDzDdSJg... (hex or base64)"
   * reference: https://en.wikipedia.org/wiki/Public-key_cryptography
   */
  @Column({ type: 'text' })
  publicKey: string; // The combined public key

  /**
   * current status of the mpc wallet
   * usage: manages wallet lifecycle
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: MpcWalletStatus,
    default: MpcWalletStatus.CREATING,
  })
  status: MpcWalletStatus;

  /**
   * additional metadata for the wallet
   * usage: stores tags, description, or creator info
   * example: { "description": "corporate funds", "tags": ["finance"] }
   * reference: none
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    description?: string;
    tags?: string[];
    createdBy?: string;
  };

  /**
   * collection of key shares associated with this wallet
   * usage: navigation to individual key shares
   * example: [KeyShare, KeyShare, ...]
   * reference: https://typeorm.io/one-to-many-relation
   */
  @OneToMany(() => KeyShare, (keyShare) => keyShare.wallet, { cascade: true })
  keyShares: KeyShare[];

  /**
   * timestamp when the wallet was created
   * usage: audit trail
   * example: "2024-04-01T09:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the wallet was last updated
   * usage: audit trail
   * example: "2024-04-02T10:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === MpcWalletStatus.ACTIVE;
  }

  canSign(): boolean {
    return (
      this.keyShares && this.keyShares.filter((share) => share.isActive()).length >= this.threshold
    );
  }

  getActiveSharesCount(): number {
    return this.keyShares ? this.keyShares.filter((share) => share.isActive()).length : 0;
  }
}
