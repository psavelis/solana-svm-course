import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { SmartAccountsService } from './smart-accounts.service';

@Controller('smart-accounts')
/**
 * Controller for managing smart accounts (Account Abstraction).
 * @see docs/diagrams/04-account-abstraction.md
 */
export class SmartAccountsController {
  constructor(private readonly smartAccountsService: SmartAccountsService) {}

  @Post()
  async create(@Body() body: { ownerAddress: string; rules: any }) {
    if (!body.ownerAddress) throw new BadRequestException('ownerAddress is required');
    return this.smartAccountsService.createSmartAccount(body.ownerAddress, body.rules || {});
  }

  @Get(':address')
  async get(@Param('address') address: string) {
    return this.smartAccountsService.findByAddress(address);
  }

  @Post(':address/validate')
  async validate(
    @Param('address') address: string,
    @Body() body: { amount: number; programId: string }
  ) {
    return this.smartAccountsService.validateTransaction(address, body.amount, body.programId);
  }
}
