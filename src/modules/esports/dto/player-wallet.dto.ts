import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PlayerWalletStatus,
  WalletTransactionType,
  WalletTransactionStatus,
} from '../entities/player-wallet.entity';

export class WalletMetadataDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'KYC verification status', default: false })
  @IsOptional()
  @IsBoolean()
  kycVerified?: boolean;
}

export class CreatePlayerWalletDto {
  @ApiProperty({ description: 'Unique player identifier', example: 'player_123456' })
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @ApiPropertyOptional({ description: 'Wallet metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => WalletMetadataDto)
  metadata?: WalletMetadataDto;
}

export class DepositDto {
  @ApiProperty({ description: 'Amount in lamports to deposit', example: '5000000000' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Solana transaction signature for the deposit',
    example: '5KtPn1...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiPropertyOptional({ description: 'Source address' })
  @IsOptional()
  @IsString()
  fromAddress?: string;
}

export class WithdrawDto {
  @ApiProperty({ description: 'Amount in lamports to withdraw', example: '2000000000' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    description: 'Destination Solana address',
    example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  })
  @IsString()
  @IsNotEmpty()
  destinationAddress: string;
}

export class PlayerWalletResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() playerId: string;
  @ApiProperty() publicKey: string;
  @ApiProperty() availableBalance: string;
  @ApiProperty() lockedBalance: string;
  @ApiProperty() totalBalance: string;
  @ApiProperty() totalDeposited: string;
  @ApiProperty() totalWithdrawn: string;
  @ApiProperty() totalWinnings: string;
  @ApiProperty() totalEntryFees: string;
  @ApiProperty({ enum: PlayerWalletStatus }) status: PlayerWalletStatus;
  @ApiPropertyOptional() metadata?: WalletMetadataDto;
  @ApiProperty() createdAt: Date;
}

export class WalletBalanceResponseDto {
  @ApiProperty() playerId: string;
  @ApiProperty() availableBalance: string;
  @ApiProperty() lockedBalance: string;
  @ApiProperty() totalBalance: string;
  @ApiProperty() currency: string;
}

export class WalletTransactionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: WalletTransactionType }) type: WalletTransactionType;
  @ApiProperty() amount: string;
  @ApiPropertyOptional() signature?: string;
  @ApiPropertyOptional() reference?: string;
  @ApiProperty({ enum: WalletTransactionStatus }) status: WalletTransactionStatus;
  @ApiPropertyOptional() failureReason?: string;
  @ApiProperty() createdAt: Date;
}

export class WithdrawalResponseDto {
  @ApiProperty() transactionId: string;
  @ApiProperty() amount: string;
  @ApiProperty() destinationAddress: string;
  @ApiPropertyOptional() signature?: string;
  @ApiProperty({ enum: WalletTransactionStatus }) status: WalletTransactionStatus;
  @ApiProperty() estimatedCompletionTime: Date;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ enum: WalletTransactionType })
  @IsOptional()
  type?: WalletTransactionType;

  @ApiPropertyOptional({ enum: WalletTransactionStatus })
  @IsOptional()
  status?: WalletTransactionStatus;

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
