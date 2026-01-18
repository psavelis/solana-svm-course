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
} from 'class-validator';
import { Type } from 'class-transformer';
import { GameType, MatchStatus } from '../entities/match.entity';

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

export class CreateMatchDto {
  @ApiProperty({
    description: 'Game type',
    enum: GameType,
    example: GameType.DUEL,
  })
  @IsEnum(GameType)
  gameType: GameType;

  @ApiProperty({
    description: 'Entry fee in lamports',
    example: '1000000000',
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
  @ApiProperty() entryFee: string;
  @ApiProperty() minPlayers: number;
  @ApiProperty() maxPlayers: number;
  @ApiProperty() currentPlayers: number;
  @ApiProperty() prizePool: string;
  @ApiProperty() platformFeePercent: number;
  @ApiProperty({ enum: MatchStatus }) status: MatchStatus;
  @ApiPropertyOptional() winnerId?: string;
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

  @ApiPropertyOptional({ description: 'Minimum entry fee' })
  @IsOptional()
  @IsString()
  minEntryFee?: string;

  @ApiPropertyOptional({ description: 'Maximum entry fee' })
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
