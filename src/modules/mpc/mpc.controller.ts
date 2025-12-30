import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import {
  MpcService,
  CreateMpcWalletRequest,
  MpcWalletResponse,
  KeyShareResponse,
  SignTransactionRequest,
  SignatureReconstructionResult,
} from "./mpc.service";
import {
  CreateMpcWalletDto,
  SignTransactionDto,
  GetKeySharesDto,
} from "./dto/mpc.dto";

@ApiTags("mpc")
@Controller("mpc")
/**
 * Controller for Multi-Party Computation (MPC) wallet operations.
 * @see docs/diagrams/08-mpc.md
 */
export class MpcController {
  constructor(private readonly mpcService: MpcService) {}

  @Post("wallets")
  @ApiOperation({
    summary: "Create a new MPC wallet with distributed key generation",
  })
  @ApiResponse({
    status: 201,
    description: "MPC wallet created successfully",
    type: Object,
  })
  async createMpcWallet(
    @Body() request: CreateMpcWalletDto,
  ): Promise<MpcWalletResponse> {
    return this.mpcService.createMpcWallet(request);
  }

  @Get("wallets")
  @ApiOperation({ summary: "Get all MPC wallets" })
  @ApiResponse({
    status: 200,
    description: "MPC wallets retrieved successfully",
    type: Array,
  })
  async getMpcWallets(): Promise<MpcWalletResponse[]> {
    return this.mpcService.getMpcWallets();
  }

  @Get("wallets/:walletId")
  @ApiOperation({ summary: "Get a specific MPC wallet by ID" })
  @ApiResponse({
    status: 200,
    description: "MPC wallet retrieved successfully",
    type: Object,
  })
  async getMpcWallet(
    @Param("walletId") walletId: string,
  ): Promise<MpcWalletResponse> {
    return this.mpcService.getMpcWallet(walletId);
  }

  @Get("wallets/:walletId/shares")
  @ApiOperation({
    summary:
      "Get key shares for a wallet (requires participant authentication)",
  })
  @ApiResponse({
    status: 200,
    description: "Key shares retrieved successfully",
    type: Array,
  })
  async getWalletKeyShares(
    @Param("walletId") walletId: string,
    @Query() query: GetKeySharesDto,
  ): Promise<KeyShareResponse[]> {
    return this.mpcService.getWalletKeyShares(walletId, query.participantId);
  }

  @Post("sign")
  @ApiOperation({
    summary: "Sign a transaction using MPC threshold signatures",
  })
  @ApiResponse({
    status: 201,
    description: "Transaction signed successfully using MPC",
    type: Object,
  })
  async signTransaction(
    @Body() request: SignTransactionDto,
  ): Promise<SignatureReconstructionResult> {
    return this.mpcService.signTransaction(request);
  }

  @Delete("wallets/:walletId/shares/:participantId/:shareIndex")
  @ApiOperation({ summary: "Revoke a key share (for security or recovery)" })
  @ApiResponse({
    status: 200,
    description: "Key share revoked successfully",
  })
  async revokeKeyShare(
    @Param("walletId") walletId: string,
    @Param("participantId") participantId: string,
    @Param("shareIndex") shareIndex: number,
  ): Promise<void> {
    return this.mpcService.revokeKeyShare(walletId, participantId, shareIndex);
  }
}
