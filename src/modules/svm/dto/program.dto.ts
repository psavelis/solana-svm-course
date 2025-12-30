import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsObject, Min, Max } from 'class-validator';
import { ProgramType, ProgramStatus } from '../program.entity';

export class CreateProgramDto {
  @ApiProperty({
    description: 'Program name',
    example: 'My Custom Program'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Program description',
    example: 'A custom program for token management',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Program type',
    enum: ProgramType,
    example: ProgramType.CUSTOM,
    required: false
  })
  @IsOptional()
  @IsEnum(ProgramType)
  programType?: ProgramType;

  @ApiProperty({
    description: 'Program bytecode (base64 encoded)',
    example: 'AGFzbQEAAAAB...',
    required: false
  })
  @IsOptional()
  @IsString()
  bytecode?: string;

  @ApiProperty({
    description: 'Maximum compute units per instruction',
    example: 200000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1400000) // Solana's max compute units
  maxComputeUnits?: number;

  @ApiProperty({
    description: 'Program version',
    example: '1.0.0',
    required: false
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { author: 'John Doe', repository: 'https://github.com/example' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateProgramDto {
  @ApiProperty({
    description: 'Program name',
    example: 'Updated Program Name',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Program description',
    example: 'Updated description',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Program status',
    enum: ProgramStatus,
    example: ProgramStatus.ACTIVE,
    required: false
  })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiProperty({
    description: 'Maximum compute units per instruction',
    example: 250000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1400000)
  maxComputeUnits?: number;

  @ApiProperty({
    description: 'Program version',
    example: '1.1.0',
    required: false
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { author: 'Jane Doe', license: 'MIT' },
    required: false
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DeployProgramDto {
  @ApiProperty({
    description: 'Program bytecode (base64 encoded)',
    example: 'AGFzbQEAAAAB...'
  })
  @IsString()
  bytecode: string;

  @ApiProperty({
    description: 'Program upgrade authority (optional, defaults to signer)',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: false
  })
  @IsOptional()
  @IsString()
  upgradeAuthority?: string;

  @ApiProperty({
    description: 'Maximum compute units for deployment',
    example: 500000,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxComputeUnits?: number;
}

export class ProgramQueryDto {
  @ApiProperty({
    description: 'Filter by program type',
    enum: ProgramType,
    required: false
  })
  @IsOptional()
  @IsEnum(ProgramType)
  programType?: ProgramType;

  @ApiProperty({
    description: 'Filter by program status',
    enum: ProgramStatus,
    required: false
  })
  @IsOptional()
  @IsEnum(ProgramStatus)
  status?: ProgramStatus;

  @ApiProperty({
    description: 'Filter by owner',
    example: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    required: false
  })
  @IsOptional()
  @IsString()
  owner?: string;

  @ApiProperty({
    description: 'Search by name or description',
    example: 'token',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

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