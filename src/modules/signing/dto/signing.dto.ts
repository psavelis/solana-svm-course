import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class GenerateKeyPairDto {
  // No input required for key generation
}

export class SignMessageDto {
  @IsNotEmpty()
  @IsString()
  privateKey: string;

  @IsNotEmpty()
  @IsString()
  message: string; // Base64 encoded message
}

export class VerifySignatureDto {
  @IsNotEmpty()
  @IsString()
  signature: string; // Base64 encoded

  @IsNotEmpty()
  @IsString()
  message: string; // Base64 encoded

  @IsNotEmpty()
  @IsString()
  publicKey: string;
}

export class SignTransactionDto {
  @IsNotEmpty()
  @IsString()
  privateKey: string;

  @IsNotEmpty()
  transactionData: any; // Would be more specific in production
}

export class CreateTransferDto {
  @IsNotEmpty()
  @IsString()
  privateKey: string;

  @IsNotEmpty()
  @IsString()
  toAddress: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;
}

export class GetPublicKeyDto {
  @IsNotEmpty()
  @IsString()
  privateKey: string;
}