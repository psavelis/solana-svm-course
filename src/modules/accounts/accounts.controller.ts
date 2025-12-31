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
import { PdaService } from "./pda.service";
import { Account } from "./account.entity";
import { PublicKey } from "@solana/web3.js";

@ApiTags("accounts")
@Controller("accounts")
/**
 * Controller for managing Solana accounts.
 * @see docs/diagrams/01-accounts-programs.md
 */
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly pdaService: PdaService,
  ) {}

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

  @Post("pda/derive")
  @ApiOperation({ summary: "Derive a Program Derived Address" })
  @ApiResponse({ status: 200, description: "PDA derivation result" })
  derivePDA(@Body() body: { programId: string; seeds: (string | number)[] }) {
    const programId = new PublicKey(body.programId);
    return this.pdaService.derivePDA(programId, body.seeds);
  }

  @Post("pda/account")
  @ApiOperation({ summary: "Derive an account PDA" })
  @ApiResponse({ status: 200, description: "Account PDA derivation result" })
  deriveAccountPDA(@Body() body: { programId: string; ownerAddress: string; accountType: string }) {
    const programId = new PublicKey(body.programId);
    const ownerAddress = new PublicKey(body.ownerAddress);
    return this.pdaService.deriveAccountPDA(programId, ownerAddress, body.accountType);
  }

  @Post("pda/ata")
  @ApiOperation({ summary: "Derive Associated Token Account address" })
  @ApiResponse({ status: 200, description: "ATA address" })
  deriveATA(@Body() body: { tokenProgramId: string; mintAddress: string; ownerAddress: string }) {
    const tokenProgramId = new PublicKey(body.tokenProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    const ownerAddress = new PublicKey(body.ownerAddress);
    return this.pdaService.deriveAssociatedTokenAccount(tokenProgramId, mintAddress, ownerAddress);
  }

  @Post("pda/validate")
  @ApiOperation({ summary: "Validate if address is a valid PDA" })
  @ApiResponse({ status: 200, description: "PDA validation result" })
  validatePDA(@Body() body: { address: string; programId: string; seeds: (string | number)[] }) {
    const address = new PublicKey(body.address);
    const programId = new PublicKey(body.programId);
    return this.pdaService.validatePDA(address, programId, body.seeds);
  }

  @Post("pda/escrow")
  @ApiOperation({ summary: "Derive an escrow PDA" })
  @ApiResponse({ status: 200, description: "Escrow PDA derivation result" })
  deriveEscrowPDA(@Body() body: { programId: string; escrowId: string; authority: string }) {
    const programId = new PublicKey(body.programId);
    const authority = new PublicKey(body.authority);
    return this.pdaService.deriveEscrowPDA(programId, body.escrowId, authority);
  }

  @Post("pda/metadata")
  @ApiOperation({ summary: "Derive NFT metadata account PDA" })
  @ApiResponse({ status: 200, description: "Metadata PDA address" })
  deriveMetadataPDA(@Body() body: { metadataProgramId: string; mintAddress: string }) {
    const metadataProgramId = new PublicKey(body.metadataProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    return this.pdaService.deriveMetadataPDA(metadataProgramId, mintAddress);
  }

  @Post("pda/master-edition")
  @ApiOperation({ summary: "Derive NFT master edition PDA" })
  @ApiResponse({ status: 200, description: "Master edition PDA address" })
  deriveMasterEditionPDA(@Body() body: { metadataProgramId: string; mintAddress: string }) {
    const metadataProgramId = new PublicKey(body.metadataProgramId);
    const mintAddress = new PublicKey(body.mintAddress);
    return this.pdaService.deriveMasterEditionPDA(metadataProgramId, mintAddress);
  }
}
