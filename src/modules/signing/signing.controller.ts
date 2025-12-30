import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SigningService, KeyPairResponse, SigningResult, VerificationResult } from './signing.service';
import {
  GenerateKeyPairDto,
  SignMessageDto,
  VerifySignatureDto,
  CreateTransferDto,
  GetPublicKeyDto,
} from './dto/signing.dto';

@ApiTags('signing')
@Controller('signing')
/**
 * Controller for managing signing and cryptography.
 * @see docs/diagrams/07-signing-cryptography.md
 */
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Post('generate-keypair')
  @ApiOperation({ summary: 'Generate a new Ed25519 keypair' })
  @ApiResponse({
    status: 201,
    description: 'Keypair generated successfully',
    type: Object,
  })
  generateKeyPair(@Body() dto: GenerateKeyPairDto): KeyPairResponse {
    return this.signingService.generateKeyPair();
  }

  @Post('sign-message')
  @ApiOperation({ summary: 'Sign a message using Ed25519' })
  @ApiResponse({
    status: 201,
    description: 'Message signed successfully',
    type: Object,
  })
  signMessage(@Body() dto: SignMessageDto): SigningResult {
    const messageBytes = Buffer.from(dto.message, 'base64');
    return this.signingService.signMessage(dto.privateKey, messageBytes);
  }

  @Post('verify-signature')
  @ApiOperation({ summary: 'Verify a signature against a message and public key' })
  @ApiResponse({
    status: 201,
    description: 'Signature verification result',
    type: Object,
  })
  verifySignature(@Body() dto: VerifySignatureDto): VerificationResult {
    const messageBytes = Buffer.from(dto.message, 'base64');
    return this.signingService.verifySignature(dto.signature, messageBytes, dto.publicKey);
  }

  @Post('create-transfer')
  @ApiOperation({ summary: 'Create and sign a SOL transfer transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transfer transaction signed and sent',
    type: Object,
  })
  async createAndSignTransfer(@Body() dto: CreateTransferDto): Promise<SigningResult> {
    return this.signingService.createAndSignTransfer(dto.privateKey, dto.toAddress, dto.amount);
  }

  @Post('get-public-key')
  @ApiOperation({ summary: 'Get public key from private key (for validation)' })
  @ApiResponse({
    status: 201,
    description: 'Public key extracted',
    type: String,
  })
  getPublicKeyFromPrivateKey(@Body() dto: GetPublicKeyDto): string {
    return this.signingService.getPublicKeyFromPrivateKey(dto.privateKey);
  }
}