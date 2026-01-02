import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from "@nestjs/swagger";
import { SmartAccountsService } from "./smart-accounts.service";

/**
 * # Smart Accounts Controller (Account Abstraction)
 *
 * REST API for managing smart accounts with programmable transaction rules.
 *
 * ## Account Abstraction on Solana
 *
 * While Solana doesn't have native account abstraction like ERC-4337,
 * similar functionality can be achieved through:
 *
 * - **Program-Owned Accounts**: PDAs with custom validation logic
 * - **Session Keys**: Temporary keys with limited permissions
 * - **Spending Limits**: Daily/per-tx limits on amounts
 * - **Allowlists**: Approved programs/operations
 *
 * ## Smart Account Features
 *
 * | Feature | Description |
 * |---------|-------------|
 * | Session Keys | Time-limited keys for dApps |
 * | Spending Rules | Max amounts per tx/day |
 * | Program Allowlist | Approved program IDs |
 * | Operation Limits | Limit specific operations |
 *
 * ## Async Authorization Flow (Kafka)
 *
 * Smart account authorization can be processed asynchronously:
 *
 * ```
 * [Client] → POST /smart-accounts/:address/validate
 *                        ↓
 *               [Validation passed]
 *                        ↓
 *         [Publish to Kafka 'transaction.authorization.requested']
 *                        ↓
 *         [SmartAccountsConsumer processes]
 *                        ↓
 *         [Emit 'transaction.authorized' or 'transaction.rejected']
 * ```
 *
 * The `SmartAccountsConsumer` handles:
 * - Validating against smart account rules
 * - Recording transaction usage (for limits)
 * - Emitting authorization decisions
 *
 * @example
 * ```typescript
 * // Create a smart account with spending rules
 * POST /smart-accounts
 * {
 *   "ownerAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
 *   "rules": {
 *     "maxTransactionAmount": 1000000000,
 *     "dailyLimit": 10000000000,
 *     "allowedPrograms": ["11111111111111111111111111111111"]
 *   }
 * }
 *
 * // Create a session key for a dApp
 * POST /smart-accounts/:address/session-keys
 * {
 *   "sessionKeyAddress": "dApp-key-address",
 *   "permissions": {
 *     "maxAmount": 1000000,
 *     "allowedPrograms": ["DEX-program-id"],
 *     "timeLimit": 3600
 *   }
 * }
 * ```
 *
 * @see [docs/diagrams/04-account-abstraction.md](docs/diagrams/04-account-abstraction.md) - Architecture
 */
@ApiTags("Smart Accounts (Account Abstraction)")
@Controller("smart-accounts")
export class SmartAccountsController {
  constructor(private readonly smartAccountsService: SmartAccountsService) {}

  @Post()
  async create(@Body() body: { ownerAddress: string; rules: any }) {
    if (!body.ownerAddress)
      throw new BadRequestException("ownerAddress is required");
    return this.smartAccountsService.createSmartAccount(
      body.ownerAddress,
      body.rules || {},
    );
  }

  @Get(":address")
  async get(@Param("address") address: string) {
    return this.smartAccountsService.findByAddress(address);
  }

  @Post(":address/validate")
  async validate(
    @Param("address") address: string,
    @Body() body: { amount: number; programId: string },
  ) {
    return this.smartAccountsService.validateTransaction(
      address,
      body.amount,
      body.programId,
    );
  }

  @Post(":address/session-keys")
  async createSessionKey(
    @Param("address") address: string,
    @Body()
    body: {
      sessionKeyAddress: string;
      permissions: {
        maxAmount?: number;
        allowedPrograms?: string[];
        allowedOperations?: string[];
        timeLimit?: number;
      };
    },
  ) {
    if (!body.sessionKeyAddress)
      throw new BadRequestException("sessionKeyAddress is required");

    return this.smartAccountsService.createSessionKey(
      address,
      body.sessionKeyAddress,
      body.permissions || {},
    );
  }

  @Get(":address/session-keys")
  async getSessionKeys(@Param("address") address: string) {
    return this.smartAccountsService.getActiveSessionKeys(address);
  }

  @Post("session-keys/:sessionKeyAddress/validate")
  async validateSessionKey(
    @Param("sessionKeyAddress") sessionKeyAddress: string,
    @Body() body: { amount?: number; programId?: string; operation?: string },
  ) {
    return this.smartAccountsService.validateSessionKey(
      sessionKeyAddress,
      body.amount,
      body.programId,
      body.operation,
    );
  }

  @Delete("session-keys/:sessionKeyAddress")
  async revokeSessionKey(@Param("sessionKeyAddress") sessionKeyAddress: string) {
    await this.smartAccountsService.revokeSessionKey(sessionKeyAddress);
    return { message: "Session key revoked successfully" };
  }
}
