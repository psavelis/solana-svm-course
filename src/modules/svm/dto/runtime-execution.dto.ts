import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ExecutionStatus, ExecutionType } from '../runtime-execution.entity';

export class ExecuteProgramDto {
  @ApiProperty({
    description: 'Program ID to execute',
    example: '11111111111111111111111111111112',
  })
  @IsString()
  programId: string;

  @ApiProperty({
    description: 'Instruction data (base64 encoded)',
    example: 'AQAAAAYAAAB0cmFuc2Zlcg==',
  })
  @IsString()
  instructionData: string;

  @ApiProperty({
    description: 'Account public keys involved in the instruction',
    example: [
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'So11111111111111111111111111111111111111112',
    ],
  })
  @IsString({ each: true })
  accounts: string[];

  @ApiProperty({
    description: 'Maximum compute units to allocate',
    example: 200000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1400000)
  maxComputeUnits?: number;

  @ApiProperty({
    description: 'Execution priority (higher = more fees)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;

  @ApiProperty({
    description: 'Additional execution metadata',
    example: { source: 'api', userId: '123' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ParallelExecutionDto {
  @ApiProperty({
    description: 'Array of program executions to run in parallel',
    type: [ExecuteProgramDto],
  })
  executions: ExecuteProgramDto[];

  @ApiProperty({
    description: 'Maximum total compute units for all executions',
    example: 1000000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTotalComputeUnits?: number;

  @ApiProperty({
    description: 'Execution timeout in seconds',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeoutSeconds?: number;

  @ApiProperty({
    description: 'Whether to continue on individual execution failures',
    example: false,
    required: false,
  })
  @IsOptional()
  continueOnFailure?: boolean;
}

export class RuntimeExecutionQueryDto {
  @ApiProperty({
    description: 'Filter by program ID',
    example: '11111111111111111111111111111112',
    required: false,
  })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiProperty({
    description: 'Filter by transaction ID',
    example:
      '5K8q3s7T8U9V1W2X3Y4Z5A6B7C8D9E1F2G3H4I5J6K7L8M9N1O2P3Q4R5S6T7U8V9W1X2Y3Z4A5B6C7D8E9F1G2H3',
    required: false,
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({
    description: 'Filter by execution status',
    enum: ExecutionStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @ApiProperty({
    description: 'Filter by execution type',
    enum: ExecutionType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ExecutionType)
  executionType?: ExecutionType;

  @ApiProperty({
    description: 'Filter executions after this timestamp',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Filter executions before this timestamp',
    example: '2024-01-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Minimum compute units used',
    example: 1000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minComputeUnits?: number;

  @ApiProperty({
    description: 'Maximum compute units used',
    example: 500000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxComputeUnits?: number;

  @ApiProperty({
    description: 'Page number (0-based)',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class ExecutionMetricsDto {
  @ApiProperty({
    description: 'Time range for metrics (in hours)',
    example: 24,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168) // 1 week
  timeRangeHours?: number = 24;

  @ApiProperty({
    description: 'Group metrics by program',
    example: true,
    required: false,
  })
  @IsOptional()
  groupByProgram?: boolean;

  @ApiProperty({
    description: 'Include detailed execution logs',
    example: false,
    required: false,
  })
  @IsOptional()
  includeLogs?: boolean;
}
