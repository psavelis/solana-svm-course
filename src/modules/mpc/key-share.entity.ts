import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { MpcWallet } from "./mpc-wallet.entity";

export enum KeyShareStatus {
  ACTIVE = "active",
  REVOKED = "revoked",
  LOST = "lost",
  RECOVERING = "recovering",
}

export enum KeyShareType {
  ORIGINAL = "original", // Original share during creation
  RECOVERY = "recovery", // New share during recovery
  BACKUP = "backup", // Backup share
}

@Entity("key_shares")
@Index(["walletId", "participantId"], { unique: true })
export class KeyShare {
  /**
   * unique identifier for the key share
   * usage: internal database reference
   * example: "e5f6g7h8-i9j0-1k2l-3m4n-5o6p7q8r9s0t"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * id of the associated mpc wallet
   * usage: links the share to its parent wallet
   * example: "d4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s"
   * reference: https://typeorm.io/relations
   */
  @Column()
  @Index()
  walletId: string;

  /**
   * mpc wallet entity relation
   * usage: navigation to the parent wallet
   * example: MpcWallet object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => MpcWallet, (wallet) => wallet.keyShares, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "walletId" })
  wallet: MpcWallet;

  /**
   * identifier for the participant holding this share
   * usage: identifies the entity (user or device) responsible for this share
   * example: "user_alice"
   * reference: none
   */
  @Column()
  participantId: string; // Identifier for the participant holding this share

  /**
   * index of this share in the tss scheme
   * usage: used in lagrange interpolation for signing
   * example: 1
   * reference: https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing
   */
  @Column()
  shareIndex: number; // Index of this share (0, 1, 2, etc.)

  /**
   * encrypted key share data
   * usage: stores the actual secret share, encrypted for the participant
   * example: "enc_data_..."
   * reference: https://en.wikipedia.org/wiki/Key_management
   */
  @Column({ type: "text" })
  encryptedShare: string; // Encrypted key share data

  /**
   * public key of the participant
   * usage: used to encrypt the share for the participant
   * example: "pub_key_..."
   * reference: https://en.wikipedia.org/wiki/Public-key_cryptography
   */
  @Column({ type: "text" })
  participantPublicKey: string; // Public key of the participant

  /**
   * status of the key share
   * usage: indicates if the share is usable
   * example: "active"
   * reference: none
   */
  @Column({
    type: "enum",
    enum: KeyShareStatus,
    default: KeyShareStatus.ACTIVE,
  })
  status: KeyShareStatus;

  /**
   * type of key share
   * usage: distinguishes between original, recovery, or backup shares
   * example: "original"
   * reference: none
   */
  @Column({
    type: "enum",
    enum: KeyShareType,
    default: KeyShareType.ORIGINAL,
  })
  type: KeyShareType;

  /**
   * metadata associated with the share
   * usage: stores device info, location, or last usage stats
   * example: { "deviceId": "iphone-12", "location": "us-east" }
   * reference: none
   */
  @Column({ type: "jsonb", nullable: true })
  metadata: {
    deviceId?: string;
    location?: string;
    lastUsed?: Date;
    recoveryAttempts?: number;
  };

  /**
   * timestamp when the share was last used for signing
   * usage: audit and security monitoring
   * example: "2024-05-01T10:00:00Z"
   * reference: none
   */
  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;

  /**
   * timestamp when the share was created
   * usage: audit trail
   * example: "2024-04-01T09:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the share was last updated
   * usage: audit trail
   * example: "2024-04-05T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === KeyShareStatus.ACTIVE;
  }

  isRevoked(): boolean {
    return this.status === KeyShareStatus.REVOKED;
  }

  canParticipate(): boolean {
    return this.isActive() && this.type !== KeyShareType.BACKUP;
  }

  markAsUsed(): void {
    this.lastUsedAt = new Date();
    if (this.metadata) {
      this.metadata.lastUsed = this.lastUsedAt;
    }
  }
}
