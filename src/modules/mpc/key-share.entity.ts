import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { MpcWallet } from './mpc-wallet.entity';

export enum KeyShareStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  LOST = 'lost',
  RECOVERING = 'recovering',
}

export enum KeyShareType {
  ORIGINAL = 'original', // Original share during creation
  RECOVERY = 'recovery', // New share during recovery
  BACKUP = 'backup', // Backup share
}

@Entity('key_shares')
@Index(['walletId', 'participantId'], { unique: true })
export class KeyShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  walletId: string;

  @ManyToOne(() => MpcWallet, wallet => wallet.keyShares, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet: MpcWallet;

  @Column()
  participantId: string; // Identifier for the participant holding this share

  @Column()
  shareIndex: number; // Index of this share (0, 1, 2, etc.)

  @Column({ type: 'text' })
  encryptedShare: string; // Encrypted key share data

  @Column({ type: 'text' })
  participantPublicKey: string; // Public key of the participant

  @Column({
    type: 'enum',
    enum: KeyShareStatus,
    default: KeyShareStatus.ACTIVE,
  })
  status: KeyShareStatus;

  @Column({
    type: 'enum',
    enum: KeyShareType,
    default: KeyShareType.ORIGINAL,
  })
  type: KeyShareType;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    deviceId?: string;
    location?: string;
    lastUsed?: Date;
    recoveryAttempts?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

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