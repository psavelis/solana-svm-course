import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  Delete,
} from "@nestjs/common";
import { SmartAccountsService } from "./smart-accounts.service";

@Controller("smart-accounts")
/**
 * Controller for managing smart accounts (Account Abstraction).
 * @see docs/diagrams/04-account-abstraction.md
 */
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
