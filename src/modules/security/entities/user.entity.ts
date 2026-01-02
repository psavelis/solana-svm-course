import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiKey } from './api-key.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  READONLY = 'readonly',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('users')
export class User {
  /**
   * unique identifier for the user
   * usage: primary key for database relations and user identification
   * example: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * user's email address
   * usage: used for login authentication and communication
   * example: "user@example.com"
   * reference: https://en.wikipedia.org/wiki/Email_address
   */
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  /**
   * hashed password for secure storage
   * usage: validates user credentials during login
   * example: "$2b$10$EpIxT98hGw..."
   * reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
   */
  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  /**
   * user's first name
   * usage: personalization and display
   * example: "john"
   * reference: none
   */
  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  /**
   * user's last name
   * usage: personalization and display
   * example: "doe"
   * reference: none
   */
  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  /**
   * role assigned to the user
   * usage: determines access control and permissions
   * example: "admin"
   * reference: https://en.wikipedia.org/wiki/Role-based_access_control
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  /**
   * current status of the user account
   * usage: manages account lifecycle (active, suspended, etc.)
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  /**
   * indicates if the email has been verified
   * usage: security measure to validate user identity
   * example: true
   * reference: https://en.wikipedia.org/wiki/Email_authentication
   */
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  /**
   * timestamp of the last successful login
   * usage: security monitoring and session management
   * example: "2024-03-10T08:00:00Z"
   * reference: none
   */
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  /**
   * number of failed login attempts
   * usage: brute-force protection mechanism
   * example: 3
   * reference: https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
   */
  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  /**
   * timestamp until which the account is locked
   * usage: temporarily disables access after excessive failed logins
   * example: "2024-03-10T08:15:00Z"
   * reference: https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
   */
  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date;

  /**
   * list of api keys associated with the user
   * usage: relation to access keys managed by this user
   * example: [ApiKey]
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @OneToMany(() => ApiKey, (apiKey) => apiKey.user)
  apiKeys: ApiKey[];

  /**
   * timestamp when the user record was created
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the user record was last updated
   * usage: audit trail
   * example: "2024-01-05T12:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual property for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  // Method to check if user is locked
  isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  // Method to check if user can attempt login
  canAttemptLogin(): boolean {
    return !this.isLocked() && this.status === UserStatus.ACTIVE;
  }
}
