import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BracketType, TournamentStatus } from '../entities/tournament.entity';
import { PrizeDistributionStrategy, PrizeRiskLevel } from '../entities/prize-distribution.entity';
import { SupportedToken } from '../entities/token.entity';

export class PrizeStructureItemDto {
  @ApiProperty({ description: 'Placement position', example: 1 })
  @IsNumber()
  @Min(1)
  place: number;

  @ApiProperty({ description: 'Prize percentage of pool', example: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({ description: 'Fixed amount in lamports' })
  @IsOptional()
  @IsString()
  fixedAmount?: string;

  @ApiPropertyOptional({ description: 'Display label', example: '1st Place' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Whether this is MVP slot', default: false })
  @IsOptional()
  @IsBoolean()
  isMvp?: boolean;
}

export class TournamentMetadataDto {
  @ApiPropertyOptional({ description: 'Tournament region' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Skill bracket requirement' })
  @IsOptional()
  @IsString()
  skillBracket?: string;

  @ApiPropertyOptional({ description: 'Tournament rules URL or text' })
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({ description: 'Stream URL' })
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional({ description: 'Organizer ID' })
  @IsOptional()
  @IsString()
  organizerId?: string;
}

export class CreateTournamentDto {
  @ApiProperty({ description: 'Tournament name', example: 'Weekly Championship' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Tournament description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Game type identifier', example: 'valorant' })
  @IsString()
  @IsNotEmpty()
  gameType: string;

  @ApiProperty({
    description: 'Token type for entry fees and prize pool',
    enum: SupportedToken,
    example: SupportedToken.USDC,
    default: SupportedToken.SOL,
  })
  @IsOptional()
  @IsEnum(SupportedToken)
  tokenType?: SupportedToken;

  @ApiProperty({
    description: 'Entry fee in base units',
    example: '5000000000',
    examples: {
      SOL: { value: '5000000000', summary: '5 SOL entry (9 decimals)' },
      USDC: { value: '25000000', summary: '$25 USDC entry (6 decimals)' },
    },
  })
  @IsString()
  @IsNotEmpty()
  entryFee: string;

  @ApiPropertyOptional({
    description: 'Guaranteed minimum prize pool in base units',
    example: '100000000000',
  })
  @IsOptional()
  @IsString()
  guaranteedPrizePool?: string;

  @ApiProperty({ description: 'Maximum participants', example: 32 })
  @IsNumber()
  @Min(2)
  @Max(1024)
  maxParticipants: number;

  @ApiPropertyOptional({ description: 'Minimum participants to start', default: 2 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  minParticipants?: number;

  @ApiProperty({
    description: 'Bracket type',
    enum: BracketType,
    example: BracketType.SINGLE_ELIMINATION,
  })
  @IsEnum(BracketType)
  bracketType: BracketType;

  @ApiPropertyOptional({ description: 'Platform fee percentage', default: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  platformFeePercent?: number;

  @ApiPropertyOptional({
    description: 'Prize distribution strategy',
    enum: PrizeDistributionStrategy,
    example: PrizeDistributionStrategy.TOP_3_SPLIT,
    default: PrizeDistributionStrategy.TOP_3_SPLIT,
  })
  @IsOptional()
  @IsEnum(PrizeDistributionStrategy)
  prizeStrategy?: PrizeDistributionStrategy;

  @ApiProperty({
    description: 'Prize structure (auto-generated based on strategy if not provided)',
    type: [PrizeStructureItemDto],
    example: [
      { place: 1, percentage: 60, label: '1st Place' },
      { place: 2, percentage: 30, label: '2nd Place' },
      { place: 3, percentage: 10, label: '3rd Place' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeStructureItemDto)
  prizeStructure: PrizeStructureItemDto[];

  @ApiProperty({
    description: 'Registration start time',
    example: '2026-01-15T00:00:00Z',
  })
  @IsDateString()
  registrationStart: string;

  @ApiProperty({
    description: 'Registration end time',
    example: '2026-01-19T23:59:59Z',
  })
  @IsDateString()
  registrationEnd: string;

  @ApiProperty({
    description: 'Tournament start date',
    example: '2026-01-20T18:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Tournament metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => TournamentMetadataDto)
  metadata?: TournamentMetadataDto;
}

export class RegisterPlayerDto {
  @ApiProperty({ description: 'Player ID', example: 'player_123456' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiPropertyOptional({ description: 'Team name for display' })
  @IsOptional()
  @IsString()
  teamName?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class AdvanceRoundDto {
  @ApiProperty({
    description: 'Match results for the round',
    type: 'array',
    example: [{ matchId: 'match_123', winnerId: 'player_456' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  results: {
    matchId: string;
    winnerId: string;
    scores?: Record<string, number>;
  }[];
}

export class TournamentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tournamentId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() gameType: string;
  @ApiProperty({ enum: SupportedToken, description: 'Token type for entry fees and prizes' })
  tokenType: SupportedToken;
  @ApiPropertyOptional({ description: 'SPL Token mint address' }) tokenMint?: string;
  @ApiProperty({ description: 'Entry fee in base units' }) entryFee: string;
  @ApiProperty({ description: 'Prize pool in base units' }) prizePool: string;
  @ApiProperty({ description: 'Guaranteed prize pool in base units' }) guaranteedPrizePool: string;
  @ApiProperty() maxParticipants: number;
  @ApiProperty() minParticipants: number;
  @ApiProperty() currentParticipants: number;
  @ApiProperty({ enum: BracketType }) bracketType: BracketType;
  @ApiProperty({ enum: TournamentStatus }) status: TournamentStatus;
  @ApiProperty() platformFeePercent: number;
  @ApiProperty({ enum: PrizeDistributionStrategy }) prizeStrategy: PrizeDistributionStrategy;
  @ApiProperty({ enum: PrizeRiskLevel }) riskLevel: PrizeRiskLevel;
  @ApiProperty({ type: [PrizeStructureItemDto] }) prizeStructure: PrizeStructureItemDto[];
  @ApiPropertyOptional() escrowAddress?: string;
  @ApiPropertyOptional() metadata?: TournamentMetadataDto;
  @ApiProperty() registrationStart: Date;
  @ApiProperty() registrationEnd: Date;
  @ApiProperty() startDate: Date;
  @ApiPropertyOptional() endDate?: Date;
  @ApiProperty() createdAt: Date;
}

export class TournamentRegistrationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() playerId: string;
  @ApiPropertyOptional() seed?: number;
  @ApiProperty() status: string;
  @ApiPropertyOptional() paymentSignature?: string;
  @ApiPropertyOptional() finalPlacement?: number;
  @ApiPropertyOptional() prizeWon?: string;
  @ApiProperty() registeredAt: Date;
}

export class BracketResponseDto {
  @ApiProperty() tournamentId: string;
  @ApiProperty() bracketType: BracketType;
  @ApiProperty() totalRounds: number;
  @ApiProperty()
  rounds: {
    roundNumber: number;
    matches: {
      matchId: string;
      player1Id?: string;
      player2Id?: string;
      winnerId?: string;
      status: string;
    }[];
  }[];
}

export class TournamentQueryDto {
  @ApiPropertyOptional({ enum: TournamentStatus })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gameType?: string;

  @ApiPropertyOptional({ enum: SupportedToken, description: 'Filter by token type' })
  @IsOptional()
  @IsEnum(SupportedToken)
  tokenType?: SupportedToken;

  @ApiPropertyOptional({ description: 'Filter by stablecoins only', default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  stablecoinsOnly?: boolean;

  @ApiPropertyOptional({ enum: PrizeDistributionStrategy })
  @IsOptional()
  @IsEnum(PrizeDistributionStrategy)
  prizeStrategy?: PrizeDistributionStrategy;

  @ApiPropertyOptional({ enum: PrizeRiskLevel, description: 'Filter by risk level' })
  @IsOptional()
  @IsEnum(PrizeRiskLevel)
  riskLevel?: PrizeRiskLevel;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
