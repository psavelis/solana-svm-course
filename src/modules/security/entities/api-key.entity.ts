import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum ApiKeyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REVOKED = 'revoked',
}

export enum ApiKeyPermission {
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
}

@Entity('api_keys')
@Index(['keyHash'])
@Index(['userId'])
export class ApiKey {
  /**
   * unique identifier for the api key
   * usage: internal database reference
   * example: "b2c3d4e5-f6g7-8h9i-0j1k-2l3m4n5o6p7q"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * id of the user who owns this api key
   * usage: links the key to a specific user
   * example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
   * reference: https://typeorm.io/relations
   */
  @Column({ type: 'uuid' })
  userId: string;

  /**
   * user entity relation
   * usage: object relation mapping to the user
   * example: User object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * friendly name for the api key
   * usage: helps users identify the key's purpose
   * example: "production backend key"
   * reference: none
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  /**
   * detailed description of the api key
   * usage: provides context on where and how the key is used
   * example: "used by the payment service for processing transactions"
   * reference: none
   */
  @Column({ type: 'text' })
  description: string;

  /**
   * hashed version of the api key
   * usage: stored securely to verify incoming keys without saving the raw secret
   * example: "sha256 hash string..."
   * reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
   */
  @Column({ type: 'varchar', length: 255 })
  keyHash: string; // Hashed version of the API key

  /**
   * first 8 characters of the api key
   * usage: allows users to identify the key without exposing the secret
   * example: "sk_live_..."
   * reference: https://stripe.com/docs/keys
   */
  @Column({ type: 'varchar', length: 255 })
  keyPrefix: string; // First 8 characters for identification

  /**
   * current status of the api key
   * usage: controls whether the key can be used
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE,
  })
  status: ApiKeyStatus;

  /**
   * permission level granted to the key
   * usage: restricts what actions the key holder can perform
   * example: "read"
   * reference: https://en.wikipedia.org/wiki/Principle_of_least_privilege
   */
  @Column({
    type: 'enum',
    enum: ApiKeyPermission,
    default: ApiKeyPermission.READ,
  })
  permission: ApiKeyPermission;

  /**
   * expiration timestamp for the key
   * usage: enforces key rotation policies
   * example: "2025-01-01T00:00:00Z"
   * reference: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  /**
   * timestamp when the key was last used
   * usage: monitoring key usage and identifying stale keys
   * example: "2024-03-15T10:30:00Z"
   * reference: none
   */
  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  /**
   * ip address of the last request using this key
   * usage: security auditing and anomaly detection
   * example: "192.168.1.1"
   * reference: none
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  lastUsedIp: string;

  /**
   * total number of requests made with this key
   * usage: usage tracking and quota enforcement
   * example: 1500
   * reference: none
   */
  @Column({ type: 'int', default: 0 })
  usageCount: number;

  /**
   * rate limit in requests per minute
   * usage: prevents abuse and ensures service stability
   * example: 60
   * reference: https://en.wikipedia.org/wiki/Rate_limiting
   */
  @Column({ type: 'int', nullable: true })
  rateLimit: number; // Requests per minute

  /**
   * timestamp when the key was created
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the key was last updated
   * usage: audit trail
   * example: "2024-02-01T12:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
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

    return permissionLevels[this.permission] >= permissionLevels[requiredPermission];
  }
}
