import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum GasMeterType {
  INSTRUCTION = 'instruction',
  PROGRAM = 'program',
  TRANSACTION = 'transaction',
  BLOCK = 'block'
}

export enum GasMeterStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXCEEDED = 'exceeded'
}

@Entity('gas_meters')
@Index(['programId'])
@Index(['accountId'])
@Index(['meterType'])
@Index(['status'])
export class GasMeter {
  @ApiProperty({
    description: 'Unique identifier for the gas meter',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Associated program ID',
    example: '11111111111111111111111111111112'
  })
  @Column({ name: 'program_id', nullable: true })
  @Index()
  programId?: string;

  @ApiProperty({
    description: 'Associated account ID',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  })
  @Column({ name: 'account_id', nullable: true })
  @Index()
  accountId?: string;

  @ApiProperty({
    description: 'Gas meter type',
    enum: GasMeterType,
    example: GasMeterType.PROGRAM
  })
  @Column({
    name: 'meter_type',
    type: 'enum',
    enum: GasMeterType,
    default: GasMeterType.PROGRAM
  })
  meterType: GasMeterType;

  @ApiProperty({
    description: 'Current meter status',
    enum: GasMeterStatus,
    example: GasMeterStatus.ACTIVE
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: GasMeterStatus,
    default: GasMeterStatus.ACTIVE
  })
  status: GasMeterStatus;

  @ApiProperty({
    description: 'Total gas allocated',
    example: 1000000
  })
  @Column({ name: 'gas_allocated', type: 'bigint', default: 1000000 })
  gasAllocated: number;

  @ApiProperty({
    description: 'Gas used so far',
    example: 250000
  })
  @Column({ name: 'gas_used', type: 'bigint', default: 0 })
  gasUsed: number;

  @ApiProperty({
    description: 'Gas remaining',
    example: 750000
  })
  @Column({ name: 'gas_remaining', type: 'bigint', default: 1000000 })
  gasRemaining: number;

  @ApiProperty({
    description: 'Gas limit per operation',
    example: 200000
  })
  @Column({ name: 'gas_limit_per_operation', type: 'bigint', default: 200000 })
  gasLimitPerOperation: number;

  @ApiProperty({
    description: 'Reset period in seconds (0 = no reset)',
    example: 86400
  })
  @Column({ name: 'reset_period_seconds', type: 'bigint', default: 0 })
  resetPeriodSeconds: number;

  @ApiProperty({
    description: 'Last reset timestamp',
    example: '2024-01-01T00:00:00Z'
  })
  @Column({ name: 'last_reset_at', nullable: true })
  lastResetAt?: Date;

  @ApiProperty({
    description: 'Next reset timestamp',
    example: '2024-01-02T00:00:00Z'
  })
  @Column({ name: 'next_reset_at', nullable: true })
  nextResetAt?: Date;

  @ApiProperty({
    description: 'Number of operations performed',
    example: 42
  })
  @Column({ name: 'operation_count', type: 'bigint', default: 0 })
  operationCount: number;

  @ApiProperty({
    description: 'Average gas per operation',
    example: 5952
  })
  @Column({ name: 'average_gas_per_operation', type: 'bigint', default: 0 })
  averageGasPerOperation: number;

  @ApiProperty({
    description: 'Peak gas usage',
    example: 150000
  })
  @Column({ name: 'peak_gas_usage', type: 'bigint', default: 0 })
  peakGasUsage: number;

  @ApiProperty({
    description: 'Gas efficiency rating (0-100)',
    example: 85
  })
  @Column({ name: 'efficiency_rating', type: 'int', default: 100 })
  efficiencyRating: number;

  @ApiProperty({
    description: 'Alert threshold percentage',
    example: 80
  })
  @Column({ name: 'alert_threshold_percent', type: 'int', default: 80 })
  alertThresholdPercent: number;

  @ApiProperty({
    description: 'Auto-pause when threshold exceeded',
    example: true
  })
  @Column({ name: 'auto_pause_on_threshold', default: false })
  autoPauseOnThreshold: boolean;

  @ApiProperty({
    description: 'Meter configuration',
    example: '{"priority": "high", "billing": "monthly"}'
  })
  @Column({ name: 'configuration', type: 'jsonb', nullable: true })
  configuration?: Record<string, any>;

  @ApiProperty({
    description: 'Creation timestamp'
  })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp'
  })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}