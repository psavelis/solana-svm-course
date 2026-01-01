import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Gas Meter Type Enum
 * usage: categorizes the scope of compute unit tracking
 * reference: https://solana.com/docs/core/runtime#compute-budget
 */
export enum GasMeterType {
  INSTRUCTION = "instruction",
  PROGRAM = "program",
  TRANSACTION = "transaction",
  BLOCK = "block",
}

/**
 * Gas Meter Status Enum
 * usage: indicates the operational state of the meter
 * reference: none
 */
export enum GasMeterStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  EXCEEDED = "exceeded",
}

/**
 * Gas Meter Entity
 * 
 * Tracks compute unit (CU) usage in Solana. While Solana uses "compute units" rather
 * than "gas" (Ethereum terminology), this entity provides metering and budgeting
 * capabilities for monitoring resource consumption.
 * 
 * Key Solana compute concepts:
 * - Default compute budget: 200,000 CU per instruction
 * - Maximum transaction budget: 1,400,000 CU
 * - Compute unit price: Determines priority fee for faster inclusion
 * - Programs can request more CU using ComputeBudgetProgram
 * 
 * Compute-intensive operations:
 * - BPF program execution
 * - Signature verification
 * - Account data reads/writes
 * - Cross-program invocations (CPIs)
 * 
 * @example
 * const meter = new GasMeter();
 * meter.programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
 * meter.gasAllocated = 1400000;
 * meter.meterType = GasMeterType.PROGRAM;
 * 
 * @see https://solana.com/docs/core/runtime#compute-budget
 * @see https://solana.com/docs/core/fees#prioritization-fees
 */
@Entity("gas_meters")
@Index(["programId"])
@Index(["accountId"])
@Index(["meterType"])
@Index(["status"])
export class GasMeter {
  /**
   * unique identifier for the gas meter
   * usage: internal database reference
   * example: "123e4567-e89b-12d3-a456-426614174000"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @ApiProperty({
    description: "Unique identifier for the gas meter",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  /**
   * associated program id being metered
   * usage: tracks compute usage for a specific program
   * example: "11111111111111111111111111111112"
   * reference: https://solana.com/docs/core/programs
   */
  @ApiProperty({
    description: "Associated program ID",
    example: "11111111111111111111111111111112",
  })
  @Column({ name: "program_id", nullable: true })
  @Index()
  programId?: string;

  /**
   * associated account id being metered
   * usage: tracks compute usage related to a specific account
   * example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
   * reference: https://solana.com/docs/core/accounts
   */
  @ApiProperty({
    description: "Associated account ID",
    example: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  })
  @Column({ name: "account_id", nullable: true })
  @Index()
  accountId?: string;

  /**
   * type of resource being metered
   * usage: determines the scope of metering (instruction, program, transaction, or block level)
   * example: "program"
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Gas meter type",
    enum: GasMeterType,
    example: GasMeterType.PROGRAM,
  })
  @Column({
    name: "meter_type",
    type: "enum",
    enum: GasMeterType,
    default: GasMeterType.PROGRAM,
  })
  meterType: GasMeterType;

  /**
   * current operational status of the meter
   * usage: controls whether the meter is actively tracking usage
   * example: "active"
   * reference: none
   */
  @ApiProperty({
    description: "Current meter status",
    enum: GasMeterStatus,
    example: GasMeterStatus.ACTIVE,
  })
  @Column({
    name: "status",
    type: "enum",
    enum: GasMeterStatus,
    default: GasMeterStatus.ACTIVE,
  })
  status: GasMeterStatus;

  /**
   * total compute units allocated to this meter
   * usage: defines the budget ceiling for tracked resources
   * example: 1000000
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Total gas allocated",
    example: 1000000,
  })
  @Column({ name: "gas_allocated", type: "bigint", default: 1000000 })
  gasAllocated: number;

  /**
   * compute units consumed so far
   * usage: tracks cumulative resource consumption
   * example: 250000
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Gas used so far",
    example: 250000,
  })
  @Column({ name: "gas_used", type: "bigint", default: 0 })
  gasUsed: number;

  /**
   * remaining compute units available
   * usage: indicates how much budget remains before limits are reached
   * example: 750000
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Gas remaining",
    example: 750000,
  })
  @Column({ name: "gas_remaining", type: "bigint", default: 1000000 })
  gasRemaining: number;

  /**
   * maximum compute units allowed per single operation
   * usage: prevents individual operations from consuming excessive resources
   * example: 200000 (default instruction budget)
   * reference: https://solana.com/docs/core/runtime#compute-budget
   */
  @ApiProperty({
    description: "Gas limit per operation",
    example: 200000,
  })
  @Column({ name: "gas_limit_per_operation", type: "bigint", default: 200000 })
  gasLimitPerOperation: number;

  /**
   * period in seconds after which the meter resets (0 = no reset)
   * usage: enables rate limiting or periodic budget renewal
   * example: 86400 (daily reset)
   * reference: none
   */
  @ApiProperty({
    description: "Reset period in seconds (0 = no reset)",
    example: 86400,
  })
  @Column({ name: "reset_period_seconds", type: "bigint", default: 0 })
  resetPeriodSeconds: number;

  /**
   * timestamp of the last meter reset
   * usage: tracks when usage counters were last cleared
   * example: "2024-01-01T00:00:00Z"
   * reference: none
   */
  @ApiProperty({
    description: "Last reset timestamp",
    example: "2024-01-01T00:00:00Z",
  })
  @Column({ name: "last_reset_at", nullable: true })
  lastResetAt?: Date;

  /**
   * scheduled time for the next meter reset
   * usage: helps clients anticipate when budget will renew
   * example: "2024-01-02T00:00:00Z"
   * reference: none
   */
  @ApiProperty({
    description: "Next reset timestamp",
    example: "2024-01-02T00:00:00Z",
  })
  @Column({ name: "next_reset_at", nullable: true })
  nextResetAt?: Date;

  /**
   * total number of operations performed
   * usage: analytics and usage tracking
   * example: 42
   * reference: none
   */
  @ApiProperty({
    description: "Number of operations performed",
    example: 42,
  })
  @Column({ name: "operation_count", type: "bigint", default: 0 })
  operationCount: number;

  /**
   * average compute units per operation
   * usage: helps estimate future resource needs
   * example: 5952
   * reference: none
   */
  @ApiProperty({
    description: "Average gas per operation",
    example: 5952,
  })
  @Column({ name: "average_gas_per_operation", type: "bigint", default: 0 })
  averageGasPerOperation: number;

  /**
   * highest compute usage recorded in a single operation
   * usage: identifies resource-intensive operations for optimization
   * example: 150000
   * reference: none
   */
  @ApiProperty({
    description: "Peak gas usage",
    example: 150000,
  })
  @Column({ name: "peak_gas_usage", type: "bigint", default: 0 })
  peakGasUsage: number;

  /**
   * efficiency rating as a percentage (0-100)
   * usage: indicates how well compute is being utilized vs wasted
   * example: 85
   * reference: none
   */
  @ApiProperty({
    description: "Gas efficiency rating (0-100)",
    example: 85,
  })
  @Column({ name: "efficiency_rating", type: "int", default: 100 })
  efficiencyRating: number;

  /**
   * percentage threshold for triggering alerts
   * usage: notifies when usage approaches limits
   * example: 80
   * reference: none
   */
  @ApiProperty({
    description: "Alert threshold percentage",
    example: 80,
  })
  @Column({ name: "alert_threshold_percent", type: "int", default: 80 })
  alertThresholdPercent: number;

  /**
   * whether to automatically pause when threshold is exceeded
   * usage: prevents runaway compute consumption
   * example: true
   * reference: none
   */
  @ApiProperty({
    description: "Auto-pause when threshold exceeded",
    example: true,
  })
  @Column({ name: "auto_pause_on_threshold", default: false })
  autoPauseOnThreshold: boolean;

  /**
   * additional meter configuration settings
   * usage: stores priority, billing, and custom settings
   * example: { "priority": "high", "billing": "monthly" }
   * reference: none
   */
  @ApiProperty({
    description: "Meter configuration",
    example: '{"priority": "high", "billing": "monthly"}',
  })
  @Column({ name: "configuration", type: "jsonb", nullable: true })
  configuration?: Record<string, any>;

  /**
   * timestamp when the meter was created
   * usage: audit trail
   * example: "2024-01-01T00:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @ApiProperty({
    description: "Creation timestamp",
  })
  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  /**
   * timestamp when the meter was last updated
   * usage: tracks changes to meter state
   * example: "2024-01-01T00:00:05Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @ApiProperty({
    description: "Last update timestamp",
  })
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
