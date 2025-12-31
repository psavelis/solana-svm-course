import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, Min, Max } from "class-validator";

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

export class CreateMultiSigAccountDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  threshold: number;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  signers: string[];

  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateMultiSigTransactionDto {
  @IsNotEmpty()
  @IsString()
  multiSigAddress: string;

  @IsNotEmpty()
  transactionData: any; // Serialized transaction
}

export class SignMultiSigTransactionDto {
  @IsNotEmpty()
  @IsString()
  txId: string;

  @IsNotEmpty()
  @IsString()
  signerPrivateKey: string;
}

export class ExecuteMultiSigTransactionDto {
  @IsNotEmpty()
  @IsString()
  txId: string;
}

export class CreateOfflineSigningRequestDto {
  @IsNotEmpty()
  transactionData: any; // Serialized transaction

  @IsNotEmpty()
  @IsString()
  publicKey: string;

  @IsOptional()
  @IsNumber()
  expiresIn?: number; // Expiration in milliseconds
}

export class CreateOfflineMessageSigningRequestDto {
  @IsNotEmpty()
  @IsString()
  message: string; // Base64 encoded message

  @IsNotEmpty()
  @IsString()
  publicKey: string;

  @IsOptional()
  @IsNumber()
  expiresIn?: number; // Expiration in milliseconds
}

export class SignOfflineRequestDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;

  @IsNotEmpty()
  @IsString()
  privateKey: string;
}

export class CancelOfflineSigningRequestDto {
  @IsNotEmpty()
  @IsString()
  requestId: string;
}
