import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Program } from "../svm/program.entity";
import { RuntimeExecution } from "../svm/runtime-execution.entity";

/**
 * CPI Invocation Entity
 * 
 * Represents an actual Cross-Program Invocation (CPI) execution on Solana.
 * This entity logs CPI calls for analytics, debugging, and audit purposes.
 * 
 * Key CPI invocation concepts:
 * - Depth Limit: CPIs can be nested up to 4 levels deep
 * - Compute Budget: Each CPI consumes compute units from the transaction budget
 * - Return Data: CPIs can return data to the caller via sol_set_return_data
 * 
 * CPI Execution Flow:
 * 1. Caller program builds instruction with accounts and data
 * 2. invoke() or invoke_signed() is called
 * 3. Runtime validates accounts and permissions
 * 4. Target program executes instruction
 * 5. Return data and result propagate back to caller
 * 
 * Error Handling:
 * - CPI errors propagate to the caller
 * - Transaction fails if any CPI fails
 * - Error messages captured in logs
 * 
 * @example
 * const invocation = new CpiInvocation();
 * invocation.transactionId = "4sGjMW1sUnHzSxGspuhp...";
 * invocation.callerProgramId = "myProgram...";
 * invocation.targetProgramId = "TokenkegQfeZyiNwAJb...";
 * invocation.instructionName = "transfer";
 * invocation.status = "success";
 * 
 * @see https://solana.com/docs/core/cpi
 * @see https://solana.com/docs/programs/debugging#logs
 */
@Entity("cpi_invocations")
export class CpiInvocation {
  /**
   * unique identifier for the invocation record
   * usage: internal database reference
   * example: "h8i9j0k1-l2m3-4n5o-6p7q-8r9s0t1u2v3w"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * transaction signature containing this cpi
   * usage: links to the parent transaction for context
   * example: "4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHirW..."
   * reference: https://solana.com/docs/core/transactions#signature
   */
  @Column({ type: "varchar", length: 88 })
  @Index()
  transactionId: string;

  /**
   * program id of the caller
   * usage: identifies which program initiated the cpi
   * example: "myDeFiProgramAddress..."
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: "varchar", length: 88 })
  @Index()
  callerProgramId: string;

  /**
   * program id of the target
   * usage: identifies which program was invoked
   * example: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: "varchar", length: 88 })
  @Index()
  targetProgramId: string;

  /**
   * name of the instruction invoked
   * usage: human-readable identifier for the operation
   * example: "transfer"
   * reference: none
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  instructionName: string;

  /**
   * serialized instruction data
   * usage: arguments passed to the instruction
   * example: { "amount": 1000000, "decimals": 6 }
   * reference: https://solana.com/docs/core/transactions#instructions
   */
  @Column({ type: "jsonb" })
  instructionData: any;

  /**
   * account metas passed to the instruction
   * usage: specifies accounts with their permissions
   * example: [{ pubkey: "...", isSigner: false, isWritable: true }]
   * reference: https://solana.com/docs/core/transactions#account-metas
   */
  @Column({ type: "jsonb", nullable: true })
  accounts: any[];

  /**
   * execution status of the cpi
   * usage: tracks success or failure
   * example: "success"
   * reference: https://solana.com/docs/core/cpi
   */
  @Column({ type: "varchar", length: 64, nullable: true })
  status: string; // 'pending', 'success', 'failed'

  /**
   * error message if the cpi failed
   * usage: debugging and error reporting
   * example: "insufficient funds"
   * reference: https://solana.com/docs/programs/debugging
   */
  @Column({ type: "text", nullable: true })
  errorMessage: string;

  /**
   * compute units consumed by this cpi
   * usage: tracks resource usage for optimization
   * example: 25000
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @Column({ type: "bigint", nullable: true })
  gasUsed: number;

  /**
   * data returned by the cpi call
   * usage: captures return values via sol_set_return_data
   * example: { "balance": 1000000 }
   * reference: https://solana.com/docs/programs/rust#return-data
   */
  @Column({ type: "jsonb", nullable: true })
  returnData: any; // Data returned from the CPI call

  /**
   * timestamp when the invocation was recorded
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * caller program entity relation
   * usage: navigation to the calling program
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: "callerProgramId" })
  callerProgram: Program;

  /**
   * target program entity relation
   * usage: navigation to the invoked program
   * example: Program object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => Program)
  @JoinColumn({ name: "targetProgramId" })
  targetProgram: Program;

  /**
   * runtime execution entity relation
   * usage: links to the parent execution context
   * example: RuntimeExecution object
   * reference: https://typeorm.io/many-to-one-one-to-many-relations
   */
  @ManyToOne(() => RuntimeExecution)
  @JoinColumn({ name: "transactionId" })
  execution: RuntimeExecution;
}
