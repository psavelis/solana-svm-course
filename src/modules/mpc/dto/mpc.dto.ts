import {
  IsString,
  IsEnum,
  IsArray,
  IsObject,
  IsOptional,
  IsNumber,
  Min,
  Max,
  ArrayMinSize,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ThresholdScheme } from "../mpc-wallet.entity";

export class ParticipantDto {
  @IsString()
  participantId: string;

  @IsString()
  participantPublicKey: string;
}

export class CreateMpcWalletDto {
  @IsString()
  name: string;

  @IsEnum(ThresholdScheme)
  thresholdScheme: ThresholdScheme;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @IsOptional()
  @IsObject()
  metadata?: {
    description?: string;
    tags?: string[];
    createdBy?: string;
  };
}

export class ParticipantShareDto {
  @IsString()
  participantId: string;

  @IsString()
  signatureShare: string;
}

export class SignTransactionDto {
  @IsString()
  walletId: string;

  @IsString()
  transactionData: string; // Base64 encoded transaction

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ParticipantShareDto)
  participantShares: ParticipantShareDto[];
}

export class GetKeySharesDto {
  @IsString()
  participantId: string;
}
