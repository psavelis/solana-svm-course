import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { ApiProperty } from "@nestjs/swagger";
import { SmartAccount } from "./smart-account.entity";

export enum SessionKeyStatus {
  ACTIVE = "active",
  EXPIRED = "expired",
  REVOKED = "revoked",
}

@Entity("session_keys")
export class SessionKey {
  /**
   * unique identifier for the session key record
   * usage: internal database reference
   * example: "b2c3d4e5-f6g7-8901-2345-678901bcdef0"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @ApiProperty({
    description: "Unique identifier for the session key record",
    example: "b2c3d4e5-f6g7-8901-2345-678901bcdef0",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * address of the parent smart account
   * usage: links the session key to the account it controls
   * example: "3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m"
   * reference: https://typeorm.io/relations
   */
  @ApiProperty({
    description: "Address of the parent smart account",
    example: "3x4y5z6a-7b8c-9d0e-1f2g-3h4i5j6k7l8m",
  })
  @Column({ name: "smart_account_address" })
  smartAccountAddress: string;

  /**
   * smart account entity relation
   * usage: navigation to the parent smart account
   * example: SmartAccount object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => SmartAccount)
  @JoinColumn({ name: "smart_account_address" })
  smartAccount: SmartAccount;

  /**
   * public key of the session key
   * usage: the ephemeral key authorized to sign transactions
   * example: "4z5x6c7v-8b9n-0m1l-2k3j-4h5g6f7d8s9a"
   * reference: https://solana.com/docs/core/accounts
   */
  @ApiProperty({
    description: "Public key of the session key",
    example: "4z5x6c7v-8b9n-0m1l-2k3j-4h5g6f7d8s9a",
  })
  @Column({ name: "session_key_address" })
  sessionKeyAddress: string;

  /**
   * permissions granted to the session key
   * usage: defines scope of allowed actions (amount, programs, etc.)
   * example: { "maxAmount": 10, "timeLimit": 3600 }
   * reference: none
   */
  @ApiProperty({
    description: "Permissions granted to the session key",
    example: { maxAmount: 10, timeLimit: 3600 },
  })
  @Column({ type: "jsonb" })
  permissions: {
    maxAmount?: number;
    allowedPrograms?: string[];
    allowedOperations?: string[];
    timeLimit?: number; // in seconds
  };

  /**
   * current status of the session key
   * usage: lifecycle management
   * example: "active"
   * reference: none
   */
  @ApiProperty({
    description: "Current status of the session key",
    enum: SessionKeyStatus,
    example: SessionKeyStatus.ACTIVE,
  })
  @Column({
    type: "enum",
    enum: SessionKeyStatus,
    default: SessionKeyStatus.ACTIVE,
  })
  status: SessionKeyStatus;

  /**
   * expiration timestamp for the session key
   * usage: security policy enforcement
   * example: "2024-01-01T12:00:00Z"
   * reference: none
   */
  @ApiProperty({
    description: "Expiration timestamp for the session key",
    example: "2024-01-01T12:00:00Z",
  })
  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  /**
   * timestamp when the session key was created
   * usage: audit trail
   * example: "2024-01-01T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @ApiProperty({
    description: "Timestamp when the session key was created",
    example: "2024-01-01T10:00:00Z",
  })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /**
   * timestamp when the session key was last updated
   * usage: audit trail
   * example: "2024-01-02T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @ApiProperty({
    description: "Timestamp when the session key was last updated",
    example: "2024-01-02T11:00:00Z",
  })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}