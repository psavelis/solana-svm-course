import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrizeDistributionStatus, PrizeSourceType } from '../entities/prize-distribution.entity';

export class PrizeRecipientDto {
  @ApiProperty({ description: 'Player ID receiving prize', example: 'player_123' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiProperty({ description: 'Placement position', example: 1 })
  @IsNumber()
  placement: number;

  @ApiPropertyOptional({ description: 'Override amount in lamports' })
  @IsOptional()
  @IsString()
  amount?: string;
}

export class DistributePrizesDto {
  @ApiProperty({
    description: 'Source type (match or tournament)',
    enum: PrizeSourceType,
    example: PrizeSourceType.MATCH,
  })
  @IsEnum(PrizeSourceType)
  sourceType: PrizeSourceType;

  @ApiProperty({
    description: 'Match ID or Tournament ID',
    example: 'match_abc123',
  })
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @ApiProperty({
    description: 'Prize recipients with placements',
    type: [PrizeRecipientDto],
    example: [
      { playerId: 'player_123', placement: 1 },
      { playerId: 'player_456', placement: 2 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrizeRecipientDto)
  recipients: PrizeRecipientDto[];
}

export class PrizeDistributionItemDto {
  @ApiProperty() walletId: string;
  @ApiProperty() playerId: string;
  @ApiProperty() placement: number;
  @ApiProperty() amount: string;
  @ApiProperty() percentage: number;
  @ApiPropertyOptional() signature?: string;
  @ApiProperty() status: 'pending' | 'completed' | 'failed';
  @ApiPropertyOptional() failureReason?: string;
  @ApiPropertyOptional() processedAt?: Date;
}

export class PrizeDistributionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PrizeSourceType }) sourceType: PrizeSourceType;
  @ApiProperty() sourceId: string;
  @ApiProperty() totalPrizePool: string;
  @ApiProperty() platformFee: string;
  @ApiProperty() distributableAmount: string;
  @ApiProperty() distributedAmount: string;
  @ApiProperty({ enum: PrizeDistributionStatus }) status: PrizeDistributionStatus;
  @ApiProperty({ type: [PrizeDistributionItemDto] }) distributions: PrizeDistributionItemDto[];
  @ApiPropertyOptional() distributedAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class PrizeInfoResponseDto {
  @ApiProperty() sourceType: PrizeSourceType;
  @ApiProperty() sourceId: string;
  @ApiProperty() totalPrizePool: string;
  @ApiProperty() platformFee: string;
  @ApiProperty() distributableAmount: string;
  @ApiProperty()
  prizeBreakdown: {
    placement: number;
    percentage: number;
    amount: string;
  }[];
}

export class PrizeHistoryQueryDto {
  @ApiPropertyOptional({ enum: PrizeSourceType })
  @IsOptional()
  @IsEnum(PrizeSourceType)
  sourceType?: PrizeSourceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  playerId?: string;

  @ApiPropertyOptional({ enum: PrizeDistributionStatus })
  @IsOptional()
  @IsEnum(PrizeDistributionStatus)
  status?: PrizeDistributionStatus;

  @ApiPropertyOptional({ default: 50 })
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
