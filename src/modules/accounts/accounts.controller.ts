import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AccountsService } from "./accounts.service";
import { Account } from "./account.entity";

@ApiTags("accounts")
@Controller("accounts")
/**
 * Controller for managing Solana accounts.
 * @see docs/diagrams/01-accounts-programs.md
 */
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new account record" })
  @ApiResponse({
    status: 201,
    description: "Account created successfully",
    type: Account,
  })
  create(@Body() createAccountDto: Partial<Account>) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all accounts" })
  @ApiResponse({
    status: 200,
    description: "List of accounts",
    type: [Account],
  })
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get account by ID" })
  @ApiResponse({ status: 200, description: "Account details", type: Account })
  findOne(@Param("id") id: string) {
    return this.accountsService.findOne(id);
  }

  @Get("address/:address")
  @ApiOperation({ summary: "Get account by address" })
  @ApiResponse({ status: 200, description: "Account details", type: Account })
  findByAddress(@Param("address") address: string) {
    return this.accountsService.findByAddress(address);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update account" })
  @ApiResponse({
    status: 200,
    description: "Account updated successfully",
    type: Account,
  })
  update(@Param("id") id: string, @Body() updateAccountDto: Partial<Account>) {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete account" })
  @ApiResponse({ status: 200, description: "Account deleted successfully" })
  remove(@Param("id") id: string) {
    return this.accountsService.remove(id);
  }

  @Get("info/:address")
  @ApiOperation({ summary: "Get Solana account info from blockchain" })
  @ApiResponse({ status: 200, description: "Account info from Solana" })
  getAccountInfo(@Param("address") address: string) {
    return this.accountsService.getAccountInfo(address);
  }

  @Get("balance/:address")
  @ApiOperation({ summary: "Get account balance from Solana" })
  @ApiResponse({ status: 200, description: "Account balance" })
  getBalance(@Param("address") address: string) {
    return this.accountsService.getBalance(address);
  }
}
