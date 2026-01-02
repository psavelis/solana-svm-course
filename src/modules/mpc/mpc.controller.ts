import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import {
  MpcService,
  CreateMpcWalletRequest,
  MpcWalletResponse,
  KeyShareResponse,
  SignTransactionRequest,
  SignatureReconstructionResult,
} from './mpc.service';
import { CreateMpcWalletDto, SignTransactionDto, GetKeySharesDto } from './dto/mpc.dto';

/**
 * # MPC Controller (Multi-Party Computation)
 *
 * REST API for MPC wallet operations using threshold signatures.
 *
 * ## What is MPC?
 *
 * Multi-Party Computation enables distributed key generation and signing
 * where no single party ever holds the complete private key:
 *
 * ```
 * [Full Key] → Split into N shares
 *                   ↓
 *   [Share 1] [Share 2] [Share 3] ... [Share N]
 *        ↓         ↓         ↓
 *   [Party 1] [Party 2] [Party 3]
 *        ↓         ↓         ↓
 *   [Partial] [Partial] [Partial]
 *        ↓         ↓         ↓
 *        └─────────┴─────────┘
 *                  ↓
 *        [Combined Signature]
 * ```
 *
 * ## Threshold Signatures (t-of-n)
 *
 * Only `t` of `n` total shares are needed to sign:
 *
 * | Config | Use Case |
 * |--------|----------|
 * | 2-of-3 | User + Recovery + Service |
 * | 3-of-5 | Corporate Treasury |
 * | 4-of-7 | DAO Multi-sig |
 *
 * ## MPC vs Multi-Sig
 *
 * | Feature | MPC | Multi-Sig |
 * |---------|-----|-----------|
 * | On-chain footprint | Single sig | Multiple sigs |
 * | Key custody | Distributed | Individual |
 * | Privacy | High | Lower |
 * | Complexity | Higher | Lower |
 *
 * ## Security Features
 *
 * - **Distributed Key Generation (DKG)**: No trusted dealer
 * - **Proactive Refresh**: Rotate shares without changing address
 * - **Share Revocation**: Invalidate compromised shares
 *
 * @example
 * ```typescript
 * // Create MPC wallet with 2-of-3 threshold
 * POST /mpc/wallets
 * {
 *   "name": "Treasury",
 *   "threshold": 2,
 *   "numShares": 3,
 *   "participantIds": ["alice", "bob", "charlie"]
 * }
 *
 * // Sign transaction with MPC
 * POST /mpc/sign
 * {
 *   "walletId": "wallet-uuid",
 *   "transactionData": "base64-serialized-tx",
 *   "signingParticipants": ["alice", "bob"],
 *   "partialSignatures": [...]
 * }
 * ```
 *
 * @see https://en.wikipedia.org/wiki/Secure_multi-party_computation - MPC Theory
 * @see https://eprint.iacr.org/2020/540 - Threshold ECDSA
 * @see [docs/diagrams/08-mpc.md](docs/diagrams/08-mpc.md) - Architecture
 */
@ApiTags('mpc')
@Controller('mpc')
export class MpcController {
  constructor(private readonly mpcService: MpcService) {}

  @Post('wallets')
  @ApiOperation({
    summary: 'Create a new MPC wallet with distributed key generation',
  })
  @ApiResponse({
    status: 201,
    description: 'MPC wallet created successfully',
    type: Object,
  })
  async createMpcWallet(@Body() request: CreateMpcWalletDto): Promise<MpcWalletResponse> {
    return this.mpcService.createMpcWallet(request);
  }

  @Get('wallets')
  @ApiOperation({ summary: 'Get all MPC wallets' })
  @ApiResponse({
    status: 200,
    description: 'MPC wallets retrieved successfully',
    type: Array,
  })
  async getMpcWallets(): Promise<MpcWalletResponse[]> {
    return this.mpcService.getMpcWallets();
  }

  @Get('wallets/:walletId')
  @ApiOperation({ summary: 'Get a specific MPC wallet by ID' })
  @ApiResponse({
    status: 200,
    description: 'MPC wallet retrieved successfully',
    type: Object,
  })
  async getMpcWallet(@Param('walletId') walletId: string): Promise<MpcWalletResponse> {
    return this.mpcService.getMpcWallet(walletId);
  }

  @Get('wallets/:walletId/shares')
  @ApiOperation({
    summary: 'Get key shares for a wallet (requires participant authentication)',
  })
  @ApiResponse({
    status: 200,
    description: 'Key shares retrieved successfully',
    type: Array,
  })
  async getWalletKeyShares(
    @Param('walletId') walletId: string,
    @Query() query: GetKeySharesDto,
  ): Promise<KeyShareResponse[]> {
    return this.mpcService.getWalletKeyShares(walletId, query.participantId);
  }

  @Post('sign')
  @ApiOperation({
    summary: 'Sign a transaction using MPC threshold signatures',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction signed successfully using MPC',
    type: Object,
  })
  async signTransaction(
    @Body() request: SignTransactionDto,
  ): Promise<SignatureReconstructionResult> {
    return this.mpcService.signTransaction(request);
  }

  @Delete('wallets/:walletId/shares/:participantId/:shareIndex')
  @ApiOperation({ summary: 'Revoke a key share (for security or recovery)' })
  @ApiResponse({
    status: 200,
    description: 'Key share revoked successfully',
  })
  async revokeKeyShare(
    @Param('walletId') walletId: string,
    @Param('participantId') participantId: string,
    @Param('shareIndex') shareIndex: number,
  ): Promise<void> {
    return this.mpcService.revokeKeyShare(walletId, participantId, shareIndex);
  }
}
