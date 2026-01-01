import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Program } from "../svm/program.entity";

/**
 * CPI Instruction Entity
 * 
 * Represents a Cross-Program Invocation (CPI) instruction template on Solana.
 * CPIs allow programs to call other programs within a single transaction,
 * enabling composability - a cornerstone of Solana's DeFi ecosystem.
 * 
 * Key CPI concepts:
 * - Caller Program: The program initiating the CPI call
 * - Target Program: The program being invoked
 * - Instruction Data: Serialized arguments for the invoked instruction
 * - Account Metas: Accounts passed to the invoked program with their permissions
 * 
 * CPI Permissions:
 * - Signer privileges can be extended to CPIs via Program Derived Addresses (PDAs)
 * - The `invoke_signed` function allows PDAs to sign on behalf of programs
 * - Account permissions must be explicitly passed in account metas
 * 
 * Common CPI Use Cases:
 * - Token transfers via SPL Token program
 * - DEX swaps through aggregator protocols
 * - Lending operations in DeFi protocols
 * - NFT minting via Metaplex
 * 
 * @example
 * const cpi = new CpiInstruction();
 * cpi.programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
 * cpi.callerProgramId = "myDeFiProgram...";
 * cpi.methodName = "transfer";
 * cpi.instructionData = { amount: 1000000 };
 * 
 * @see https://solana.com/docs/core/cpi
 * @see https://solana.com/docs/core/pda#how-to-sign-with-a-pda
 */
@Entity("cpi_instructions")
export class CpiInstruction {
  /**
   * unique identifier for the cpi instruction template
   * usage: internal database reference
   * example: "f6g7h8i9-j0k1-2l3m-4n5o-6p7q8r9s0t1u"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * program id of the target program being called
   * usage: identifies which program will execute the instruction
   * example: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: "varchar", length: 88 })
  programId: string; // The program being invoked

  /**
   * program id of the calling program
   * usage: identifies the program initiating the cpi
   * example: "myDeFiProgramAddress..."
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: "varchar", length: 88 })
  callerProgramId: string; // The program making the CPI call

  /**
   * serialized instruction data
   * usage: arguments passed to the invoked program's instruction handler
   * example: { "amount": 1000000, "decimals": 6 }
   * reference: https://solana.com/docs/core/transactions#instructions
   */
  @Column({ type: "jsonb" })
  instructionData: any; // The instruction data for the CPI

  /**
   * account metas for the instruction
   * usage: specifies accounts and their permissions (signer, writable)
   * example: [{ pubkey: "...", isSigner: false, isWritable: true }]
   * reference: https://solana.com/docs/core/transactions#account-metas
   */
  @Column({ type: "jsonb", nullable: true })
  accounts: any[]; // Account metas for the instruction

  /**
   * human-readable method name
   * usage: identifies the instruction for debugging and logging
   * example: "transfer"
   * reference: none
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  methodName: string; // The method being called (for logging/debugging)

  /**
   * whether the cpi requires special permissions
   * usage: indicates if pda signing or elevated privileges are needed
   * example: true
   * reference: https://solana.com/docs/core/cpi#privilege-extension
   */
  @Column({ type: "boolean", default: false })
  requiresPermission: boolean;

  /**
   * program managing permissions for this cpi
   * usage: for permission-gated cpis
   * example: "permissionProgramAddress..."
   * reference: none
   */
  @Column({ type: "varchar", length: 88, nullable: true })
  permissionProgramId: string; // Program that manages permissions

  /**
   * permission level required
   * usage: access control classification
   * example: "admin"
   * reference: none
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  permissionLevel: string; // e.g., 'read', 'write', 'admin'

  /**
   * indicates if the cpi instruction is enabled
   * usage: allows disabling without deletion
   * example: true
   * reference: none
   */
  @Column({ type: "boolean", default: true })
  isActive: boolean;

  /**
   * timestamp when the instruction was created
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the instruction was last updated
   * usage: tracks configuration changes
   * example: "2024-01-16T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * target program entity relation
   * usage: navigation to the program being called
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: "programId" })
  program: Program;

  /**
   * caller program entity relation
   * usage: navigation to the calling program
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: "callerProgramId" })
  callerProgram: Program;
}
