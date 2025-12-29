import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";

export enum ApiKeyStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  REVOKED = "revoked",
}

export enum ApiKeyPermission {
  READ = "read",
  WRITE = "write",
  ADMIN = "admin",
}

@Entity("api_keys")
@Index(["keyHash"])
@Index(["userId"])
export class ApiKey {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "varchar", length: 255 })
  keyHash: string; // Hashed version of the API key

  @Column({ type: "varchar", length: 255 })
  keyPrefix: string; // First 8 characters for identification

  @Column({
    type: "enum",
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  @Column({
    type: "enum",
    enum: ApiKeyPermission,
    default: ApiKeyPermission.READ,
  })
  permission: ApiKeyPermission;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastUsedAt: Date;

  @Column({ type: "varchar", length: 45, nullable: true })
  lastUsedIp: string;

  @Column({ type: "int", default: 0 })
  usageCount: number;

  @Column({ type: "int", nullable: true })
  rateLimit: number; // Requests per minute

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Method to check if API key is expired
  isExpired(): boolean {
    return this.expiresAt && this.expiresAt < new Date();
  }

  // Method to check if API key is valid
  isValid(): boolean {
    return this.status === ApiKeyStatus.ACTIVE && !this.isExpired();
  }

  // Method to check permission level
  hasPermission(requiredPermission: ApiKeyPermission): boolean {
    const permissionLevels = {
      [ApiKeyPermission.READ]: 1,
      [ApiKeyPermission.WRITE]: 2,
      [ApiKeyPermission.ADMIN]: 3,
    };

    return (
      permissionLevels[this.permission] >= permissionLevels[requiredPermission]
    );
  }
}
