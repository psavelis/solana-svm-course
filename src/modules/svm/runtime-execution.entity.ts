import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Program } from './program.entity';

export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

export enum ExecutionType {
  INSTRUCTION = 'instruction',
  CPI = 'cpi',
  INTERNAL = 'internal'
}

@Entity('runtime_executions')
@Index(['programId'])
@Index(['transactionId'])
@Index(['status'])
@Index(['createdAt'])
export class RuntimeExecution {
  @ApiProperty({
    description: 'Unique identifier for the execution record',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Associated program ID',
    example: '11111111111111111111111111111112'
  })
  @Column({ name: 'program_id' })
  @Index()
  programId: string;

  @ManyToOne(() => Program)
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @ApiProperty({
    description: 'Transaction ID that triggered this execution',
    example: '5K8q3s7T8U9V1W2X3Y4Z5A6B7C8D9E1F2G3H4I5J6K7L8M9N1O2P3Q4R5S6T7U8V9W1X2Y3Z4A5B6C7D8E9F1G2H3'
  })
  @Column({ name: 'transaction_id', nullable: true })
  transactionId?: string;

  @ApiProperty({
    description: 'Instruction index within the transaction',
    example: 0
  })
  @Column({ name: 'instruction_index', type: 'int', default: 0 })
  instructionIndex: number;

  @ApiProperty({
    description: 'Execution type',
    enum: ExecutionType,
    example: ExecutionType.INSTRUCTION
  })
  @Column({
    name: 'execution_type',
    type: 'enum',
    enum: ExecutionType,
    default: ExecutionType.INSTRUCTION
  })
  executionType: ExecutionType;

  @ApiProperty({
    description: 'Current execution status',
    enum: ExecutionStatus,
    example: ExecutionStatus.RUNNING
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.PENDING
  })
  status: ExecutionStatus;

  @ApiProperty({
    description: 'Compute units used',
    example: 150000
  })
  @Column({ name: 'compute_units_used', type: 'bigint', default: 0 })
  computeUnitsUsed: number;

  @ApiProperty({
    description: 'Compute units allocated',
    example: 200000
  })
  @Column({ name: 'compute_units_allocated', type: 'bigint', default: 200000 })
  computeUnitsAllocated: number;

  @ApiProperty({
    description: 'Execution time in milliseconds',
    example: 150
  })
  @Column({ name: 'execution_time_ms', type: 'int', nullable: true })
  executionTimeMs?: number;

  @ApiProperty({
    description: 'Memory usage in bytes',
    example: 1024000
  })
  @Column({ name: 'memory_usage_bytes', type: 'bigint', default: 0 })
  memoryUsageBytes: number;

  @ApiProperty({
    description: 'Gas cost (in lamports)',
    example: 5000
  })
  @Column({ name: 'gas_cost', type: 'bigint', default: 0 })
  gasCost: number;

  @ApiProperty({
    description: 'Error message if execution failed',
    example: 'Insufficient funds for transaction'
  })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({
    description: 'Execution logs',
    example: ['Program log: Hello World', 'Program consumed: 1234 of 200000 compute units']
  })
  @Column({ name: 'logs', type: 'jsonb', nullable: true })
  logs?: string[];

  @ApiProperty({
    description: 'Accounts accessed during execution',
    example: ['11111111111111111111111111111112', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v']
  })
  @Column({ name: 'accounts_accessed', type: 'jsonb', nullable: true })
  accountsAccessed?: string[];

  @ApiProperty({
    description: 'Slot number when execution occurred',
    example: 123456789
  })
  @Column({ name: 'slot_number', type: 'bigint', nullable: true })
  slotNumber?: number;

  @ApiProperty({
    description: 'Block hash',
    example: '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZAMdL4VZHir'
  })
  @Column({ name: 'block_hash', nullable: true })
  blockHash?: string;

  @ApiProperty({
    description: 'Execution metadata',
    example: '{"priority": "high", "source": "api"}'
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}