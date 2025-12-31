import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { SmartAccount } from "./smart-account.entity";

export enum SessionKeyStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

@Entity("session_keys")
export class SessionKey {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "smart_account_address" })
  smartAccountAddress: string;

  @ManyToOne(() => SmartAccount)
  @JoinColumn({ name: "smart_account_address" })
  smartAccount: SmartAccount;

  @Column({ name: "session_key_address" })
  sessionKeyAddress: string;

  @Column({ type: "jsonb" })
  permissions: {
    maxAmount?: number;
    allowedPrograms?: string[];
    allowedOperations?: string[];
    timeLimit?: number; // in seconds
  };

  @Column({
    type: "enum",
    enum: SessionKeyStatus,
    default: SessionKeyStatus.ACTIVE,
  })
  status: SessionKeyStatus;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}