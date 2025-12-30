import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { GasMeterType, GasMeterStatus } from '../gas-meter.entity';

export class CreateGasMeterDto {
  @ApiProperty({
    description: 'Associated program ID',
    example: '11111111111111111111111111111112',
    required: false
  })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiProperty({
    description: 'Associated account ID',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: false
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({
    description: 'Gas meter type',
    enum: GasMeterType,
    example: GasMeterType.PROGRAM
  })
  @IsEnum(GasMeterType)
  meterType: GasMeterType;

  @ApiProperty({
    description: 'Total gas allocated',
    example: 1000000
  })
  @IsNumber()
  @Min(1)
  gasAllocated: number;

  @ApiProperty({
    description: 'Gas limit per operation',
    example: 200000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  gasLimitPerOperation?: number;

  @ApiProperty({
    description: 'Reset period in seconds (0 = no reset)',
    example: 86400,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resetPeriodSeconds?: number;

  @ApiProperty({
    description: 'Alert threshold percentage',
    example: 80,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;

  @ApiProperty({
    description: 'Auto-pause when threshold exceeded',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  autoPauseOnThreshold?: boolean;

  @ApiProperty({
    description: 'Meter configuration',
    example: { priority: 'high', billing: 'monthly' },
    required: false
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

export class UpdateGasMeterDto {
  @ApiProperty({
    description: 'Meter status',
    enum: GasMeterStatus,
    example: GasMeterStatus.ACTIVE,
    required: false
  })
  @IsOptional()
  @IsEnum(GasMeterStatus)
  status?: GasMeterStatus;

  @ApiProperty({
    description: 'Additional gas to allocate',
    example: 500000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  addGasAllocation?: number;

  @ApiProperty({
    description: 'Gas limit per operation',
    example: 250000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  gasLimitPerOperation?: number;

  @ApiProperty({
    description: 'Reset period in seconds',
    example: 604800, // 1 week
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  resetPeriodSeconds?: number;

  @ApiProperty({
    description: 'Alert threshold percentage',
    example: 90,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;

  @ApiProperty({
    description: 'Auto-pause when threshold exceeded',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  autoPauseOnThreshold?: boolean;

  @ApiProperty({
    description: 'Meter configuration',
    example: { priority: 'low', billing: 'daily' },
    required: false
  })
  @IsOptional()
  @IsObject()
  configuration?: Record<string, any>;
}

export class GasMeterQueryDto {
  @ApiProperty({
    description: 'Filter by program ID',
    example: '11111111111111111111111111111112',
    required: false
  })
  @IsOptional()
  @IsString()
  programId?: string;

  @ApiProperty({
    description: 'Filter by account ID',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: false
  })
  @IsOptional()
  @IsString()
  accountId?: string;

  @ApiProperty({
    description: 'Filter by meter type',
    enum: GasMeterType,
    required: false
  })
  @IsOptional()
  @IsEnum(GasMeterType)
  meterType?: GasMeterType;

  @ApiProperty({
    description: 'Filter by meter status',
    enum: GasMeterStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(GasMeterStatus)
  status?: GasMeterStatus;

  @ApiProperty({
    description: 'Filter by gas usage threshold (percentage)',
    example: 50,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  usageThresholdPercent?: number;

  @ApiProperty({
    description: 'Page number (0-based)',
    example: 0,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  page?: number = 0;

  @ApiProperty({
    description: 'Items per page',
    example: 20,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class GasUsageDto {
  @ApiProperty({
    description: 'Gas meter ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  meterId: string;

  @ApiProperty({
    description: 'Gas amount to consume',
    example: 50000
  })
  @IsNumber()
  @Min(1)
  gasAmount: number;

  @ApiProperty({
    description: 'Operation description',
    example: 'Token transfer instruction',
    required: false
  })
  @IsOptional()
  @IsString()
  operation?: string;

  @ApiProperty({
    description: 'Force consumption even if limit exceeded',
    example: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

export class ResetGasMeterDto {
  @ApiProperty({
    description: 'Reset to full allocation',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  fullReset?: boolean;

  @ApiProperty({
    description: 'New gas allocation amount (if not full reset)',
    example: 2000000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  newAllocation?: number;
}