import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsObject,
  ValidateNested,
  IsArray,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameType, MatchStatus } from '../entities/match.entity';
import { PrizeDistributionStrategy, PrizeRiskLevel } from '../entities/prize-distribution.entity';
import { SupportedToken } from '../entities/token.entity';

export class MatchMetadataDto {
  @ApiPropertyOptional({ description: 'Game name', example: 'Counter-Strike 2' })
  @IsOptional()
  @IsString()
  gameName?: string;

  @ApiPropertyOptional({ description: 'Game mode', example: 'Competitive' })
  @IsOptional()
  @IsString()
  gameMode?: string;

  @ApiPropertyOptional({ description: 'Match region', example: 'NA-East' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ description: 'Skill bracket', example: 'Diamond' })
  @IsOptional()
  @IsString()
  skillBracket?: string;

  @ApiPropertyOptional({ description: 'Match rules' })
  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}

/**
 * Prize structure item for custom distribution
 */
export class MatchPrizeStructureDto {
  @ApiProperty({ description: 'Placement position (1 = winner)', example: 1 })
  @IsNumber()
  @Min(1)
  place: number;

  @ApiProperty({ description: 'Prize percentage of distributable pool', example: 60 })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({ description: 'Display label', example: '1st Place' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Whether this is MVP slot', default: false })
  @IsOptional()
  @IsBoolean()
  isMvp?: boolean;
}

export class CreateMatchDto {
  @ApiProperty({
    description: 'Game type',
    enum: GameType,
    example: GameType.DUEL,
  })
  @IsEnum(GameType)
  gameType: GameType;

  @ApiProperty({
    description: 'Token type for entry fees and prize pool',
    enum: SupportedToken,
    example: SupportedToken.SOL,
    default: SupportedToken.SOL,
  })
  @IsOptional()
  @IsEnum(SupportedToken)
  tokenType?: SupportedToken;

  @ApiProperty({
    description: 'Entry fee in base units (lamports for SOL, micro-units for USDC/USDT)',
    example: '1000000000',
    examples: {
      SOL: { value: '1000000000', summary: '1 SOL (9 decimals)' },
      USDC: { value: '10000000', summary: '10 USDC (6 decimals)' },
      USDT: { value: '5000000', summary: '5 USDT (6 decimals)' },
    },
  })
  @IsString()
  @IsNotEmpty()
  entryFee: string;

  @ApiPropertyOptional({
    description: 'Minimum players required',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  minPlayers?: number;

  @ApiPropertyOptional({
    description: 'Maximum players allowed',
    example: 2,
    default: 2,
  })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  maxPlayers?: number;

  @ApiPropertyOptional({
    description: 'Platform fee percentage',
    example: 5.0,
    default: 5.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  platformFeePercent?: number;

  @ApiPropertyOptional({
    description: 'Prize distribution strategy',
    enum: PrizeDistributionStrategy,
    example: PrizeDistributionStrategy.WINNER_TAKES_ALL,
    default: PrizeDistributionStrategy.WINNER_TAKES_ALL,
  })
  @IsOptional()
  @IsEnum(PrizeDistributionStrategy)
  prizeStrategy?: PrizeDistributionStrategy;

  @ApiPropertyOptional({
    description: 'Custom prize structure (required when strategy is CUSTOM)',
    type: [MatchPrizeStructureDto],
    example: [
      { place: 1, percentage: 70, label: '1st Place' },
      { place: 2, percentage: 20, label: '2nd Place' },
      { place: 0, percentage: 10, label: 'MVP Bonus', isMvp: true },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchPrizeStructureDto)
  prizeStructure?: MatchPrizeStructureDto[];

  @ApiPropertyOptional({
    description: 'Scheduled start time',
    example: '2026-01-20T18:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Match metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MatchMetadataDto)
  metadata?: MatchMetadataDto;
}

export class JoinMatchDto {
  @ApiProperty({
    description: 'Player ID',
    example: 'player_123456',
  })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiPropertyOptional({ description: 'Team ID for team matches' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;
}

export class SubmitResultDto {
  @ApiProperty({
    description: 'Winner player IDs',
    example: ['player_123'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  winnerIds: string[];

  @ApiPropertyOptional({
    description: 'Scores by player ID',
    example: { player_123: 16, player_456: 12 },
  })
  @IsOptional()
  @IsObject()
  scores?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'MVP player ID (required for PERFORMANCE_MVP strategy)',
    example: 'player_mvp123',
  })
  @IsOptional()
  @IsString()
  mvpPlayerId?: string;

  @ApiPropertyOptional({
    description: 'Reason for MVP selection',
    example: 'Most kills and assists in the match',
  })
  @IsOptional()
  @IsString()
  mvpReason?: string;

  @ApiPropertyOptional({
    description: 'Proof of result (hash, URL, etc.)',
    example: 'QmX4k...',
  })
  @IsOptional()
  @IsString()
  proof?: string;

  @ApiProperty({
    description: 'ID of user submitting result',
    example: 'admin_123',
  })
  @IsString()
  @IsNotEmpty()
  submittedBy: string;
}

export class MatchResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() matchId: string;
  @ApiProperty({ enum: GameType }) gameType: GameType;
  @ApiProperty({ enum: SupportedToken, description: 'Token type for entry fees and prizes' })
  tokenType: SupportedToken;
  @ApiPropertyOptional({ description: 'SPL Token mint address' }) tokenMint?: string;
  @ApiProperty({ description: 'Entry fee in base units' }) entryFee: string;
  @ApiProperty() minPlayers: number;
  @ApiProperty() maxPlayers: number;
  @ApiProperty() currentPlayers: number;
  @ApiProperty({ description: 'Prize pool in base units' }) prizePool: string;
  @ApiProperty() platformFeePercent: number;
  @ApiProperty({ enum: PrizeDistributionStrategy }) prizeStrategy: PrizeDistributionStrategy;
  @ApiProperty({ enum: PrizeRiskLevel }) riskLevel: PrizeRiskLevel;
  @ApiPropertyOptional({ type: [MatchPrizeStructureDto] })
  prizeStructure?: MatchPrizeStructureDto[];
  @ApiProperty({ enum: MatchStatus }) status: MatchStatus;
  @ApiPropertyOptional() winnerId?: string;
  @ApiPropertyOptional() mvpPlayerId?: string;
  @ApiPropertyOptional() escrowAddress?: string;
  @ApiPropertyOptional() metadata?: MatchMetadataDto;
  @ApiPropertyOptional() scheduledAt?: Date;
  @ApiPropertyOptional() startedAt?: Date;
  @ApiPropertyOptional() endedAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class MatchParticipantResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() playerId: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() placement?: number;
  @ApiPropertyOptional() prizeWon?: string;
  @ApiProperty() joinedAt: Date;
}

export class MatchQueryDto {
  @ApiPropertyOptional({ enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiPropertyOptional({ enum: GameType })
  @IsOptional()
  @IsEnum(GameType)
  gameType?: GameType;

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

  @ApiPropertyOptional({ description: 'Minimum entry fee in base units' })
  @IsOptional()
  @IsString()
  minEntryFee?: string;

  @ApiPropertyOptional({ description: 'Maximum entry fee in base units' })
  @IsOptional()
  @IsString()
  maxEntryFee?: string;

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
