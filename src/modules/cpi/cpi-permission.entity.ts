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
import { Program } from '../svm/program.entity';

/**
 * CPI Permission Entity
 *
 * Represents permission grants for Cross-Program Invocation (CPI) between Solana
 * programs. While Solana's permissionless CPI model allows any program to call
 * any other program, this entity tracks application-level permission logic.
 *
 * Key permission concepts:
 * - Privilege Extension: Signers from the calling program can be passed to the callee
 * - PDA Signing: Programs can sign via `invoke_signed` for PDAs they own
 * - Account Permissions: Read/write access determined by account_meta flags
 *
 * Permission Types:
 * - invoke: Can call the program's instructions
 * - read: Can read account data owned by the program
 * - write: Can modify account data via CPI
 * - admin: Full control including upgrades
 *
 * Security Considerations:
 * - CPIs inherit signer privileges - be careful what you sign
 * - Only PDAs derived from your program can sign on your behalf
 * - Validate all accounts in CPI to prevent unauthorized access
 *
 * @example
 * const perm = new CpiPermission();
 * perm.programId = "targetProgramAddress...";
 * perm.granterProgramId = "myProgramAddress...";
 * perm.permissionType = "invoke";
 * perm.constraints = { maxAmount: 1000000 };
 *
 * @see https://solana.com/docs/core/cpi#privilege-extension
 * @see https://solana.com/docs/core/pda#how-to-sign-with-a-pda
 */
@Entity('cpi_permissions')
export class CpiPermission {
  /**
   * unique identifier for the permission record
   * usage: internal database reference
   * example: "g7h8i9j0-k1l2-3m4n-5o6p-7q8r9s0t1u2v"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * program id being granted permission
   * usage: identifies the program that receives the permission
   * example: "targetProgramAddress..."
   * reference: https://solana.com/docs/core/programs
   */
  @Column({ type: 'varchar', length: 88 })
  @Index()
  programId: string; // Program being granted permission

  /**
   * program id granting the permission
   * usage: identifies the program authorizing the cpi
   * example: "granterProgramAddress..."
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: 'varchar', length: 88 })
  @Index()
  granterProgramId: string; // Program granting the permission

  /**
   * specific account id if permission is account-scoped
   * usage: limits permission to operations on a specific account
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @Column({ type: 'varchar', length: 88, nullable: true })
  @Index()
  accountId: string; // Specific account if permission is account-specific

  /**
   * type of permission granted
   * usage: defines the allowed operations
   * example: "invoke"
   * reference: none
   */
  @Column({ type: 'varchar', length: 64 })
  permissionType: string; // e.g., 'invoke', 'read', 'write', 'admin'

  /**
   * additional constraints on the permission
   * usage: limits scope of granted operations
   * example: { "maxAmount": 1000000, "allowedMethods": ["transfer"] }
   * reference: none
   */
  @Column({ type: 'jsonb', nullable: true })
  constraints: any; // Additional constraints on the permission

  /**
   * indicates if the permission is currently active
   * usage: enables/disables without deletion
   * example: true
   * reference: none
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * optional expiration timestamp
   * usage: automatically revokes permission after this time
   * example: "2024-12-31T23:59:59Z"
   * reference: none
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date; // Optional expiration

  /**
   * timestamp when the permission was created
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the permission was last updated
   * usage: tracks modifications
   * example: "2024-01-16T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * target program entity relation
   * usage: navigation to the permitted program
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: 'programId' })
  program: Program;

  /**
   * granter program entity relation
   * usage: navigation to the granting program
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: 'granterProgramId' })
  granterProgram: Program;
}
