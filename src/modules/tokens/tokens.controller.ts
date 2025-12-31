import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TokensService } from "./tokens.service";
import { Token } from "./token.entity";

@ApiTags("tokens")
@Controller("tokens")
/**
 * Controller for managing SPL tokens.
 * @see docs/diagrams/03-token-standards.md
 */
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Post()
  @ApiOperation({ summary: "Create a new token record" })
  @ApiResponse({
    status: 201,
    description: "Token created successfully",
    type: Token,
  })
  create(@Body() createTokenDto: Partial<Token>) {
    return this.tokensService.create(createTokenDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all tokens" })
  @ApiResponse({ status: 200, description: "List of tokens", type: [Token] })
  findAll() {
    return this.tokensService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get token by ID" })
  @ApiResponse({ status: 200, description: "Token details", type: Token })
  findOne(@Param("id") id: string) {
    return this.tokensService.findOne(id);
  }

  @Get("mint/:mintAddress")
  @ApiOperation({ summary: "Get token by mint address" })
  @ApiResponse({ status: 200, description: "Token details", type: Token })
  findByMint(@Param("mintAddress") mintAddress: string) {
    return this.tokensService.findByMint(mintAddress);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update token" })
  @ApiResponse({
    status: 200,
    description: "Token updated successfully",
    type: Token,
  })
  update(@Param("id") id: string, @Body() updateTokenDto: Partial<Token>) {
    return this.tokensService.update(id, updateTokenDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete token" })
  @ApiResponse({ status: 200, description: "Token deleted successfully" })
  remove(@Param("id") id: string) {
    return this.tokensService.remove(id);
  }

  @Get("info/:mintAddress")
  @ApiOperation({ summary: "Get token info from Solana" })
  @ApiResponse({ status: 200, description: "Token info from Solana" })
  getTokenInfo(@Param("mintAddress") mintAddress: string) {
    return this.tokensService.getTokenInfo(mintAddress);
  }

  @Get("balance/:ownerAddress/:mintAddress")
  @ApiOperation({ summary: "Get token balance for owner" })
  @ApiResponse({ status: 200, description: "Token balance" })
  getTokenBalance(
    @Param("ownerAddress") ownerAddress: string,
    @Param("mintAddress") mintAddress: string,
  ) {
    return this.tokensService.getTokenBalance(ownerAddress, mintAddress);
  }

  @Get("accounts/:ownerAddress")
  @ApiOperation({ summary: "Get all token accounts for owner" })
  @ApiResponse({ status: 200, description: "List of token accounts" })
  getTokenAccounts(@Param("ownerAddress") ownerAddress: string) {
    return this.tokensService.getTokenAccounts(ownerAddress);
  }

  @Post("mint")
  @ApiOperation({ summary: "Create a new token mint" })
  @ApiResponse({ status: 201, description: "Token mint created successfully" })
  createTokenMint(@Body() body: { payerPrivateKey: string; decimals?: number; freezeAuthority?: string }) {
    return this.tokensService.createTokenMint(
      body.payerPrivateKey,
      body.decimals || 9,
      body.freezeAuthority,
    );
  }

  @Post("mint-tokens")
  @ApiOperation({ summary: "Mint tokens to an account" })
  @ApiResponse({ status: 200, description: "Tokens minted successfully" })
  mintTokens(@Body() body: { payerPrivateKey: string; mintAddress: string; recipientAddress: string; amount: number }) {
    return this.tokensService.mintTokens(
      body.payerPrivateKey,
      body.mintAddress,
      body.recipientAddress,
      body.amount,
    );
  }

  @Post("create-nft")
  @ApiOperation({ summary: "Create NFT with metadata" })
  @ApiResponse({ status: 201, description: "NFT created successfully" })
  createNFT(@Body() body: { payerPrivateKey: string; name: string; symbol: string; uri: string; sellerFeeBasisPoints?: number }) {
    return this.tokensService.createNFTWithMetadata(
      body.payerPrivateKey,
      body.name,
      body.symbol,
      body.uri,
      body.sellerFeeBasisPoints || 500,
    );
  }

  @Post("burn-tokens")
  @ApiOperation({ summary: "Burn tokens from an account" })
  @ApiResponse({ status: 200, description: "Tokens burned successfully" })
  burnTokens(@Body() body: { ownerPrivateKey: string; mintAddress: string; amount: number }) {
    return this.tokensService.burnTokens(
      body.ownerPrivateKey,
      body.mintAddress,
      body.amount,
    );
  }

  @Get("supply/:mintAddress")
  @ApiOperation({ summary: "Get token supply information" })
  @ApiResponse({ status: 200, description: "Token supply information" })
  getTokenSupply(@Param("mintAddress") mintAddress: string) {
    return this.tokensService.getTokenSupply(mintAddress);
  }

  @Post("ata")
  @ApiOperation({ summary: "Get or create associated token account" })
  @ApiResponse({ status: 200, description: "ATA address and creation status" })
  getOrCreateATA(@Body() body: { payerPrivateKey: string; mintAddress: string; ownerAddress: string }) {
    return this.tokensService.getOrCreateATA(
      body.payerPrivateKey,
      body.mintAddress,
      body.ownerAddress,
    );
  }

  @Get("ata/:mintAddress/:ownerAddress")
  @ApiOperation({ summary: "Get associated token account address" })
  @ApiResponse({ status: 200, description: "ATA address" })
  getATA(
    @Param("mintAddress") mintAddress: string,
    @Param("ownerAddress") ownerAddress: string,
  ) {
    return this.tokensService.getATA(mintAddress, ownerAddress);
  }

  @Post("close-account")
  @ApiOperation({ summary: "Close token account" })
  @ApiResponse({ status: 200, description: "Token account closed successfully" })
  closeTokenAccount(@Body() body: { ownerPrivateKey: string; mintAddress: string; recipientAddress?: string }) {
    return this.tokensService.closeTokenAccount(
      body.ownerPrivateKey,
      body.mintAddress,
      body.recipientAddress,
    );
  }

  @Get("nft-ownership/:ownerAddress/:mintAddress")
  @ApiOperation({ summary: "Verify NFT ownership" })
  @ApiResponse({ status: 200, description: "NFT ownership verification result" })
  verifyNFTOwnership(
    @Param("ownerAddress") ownerAddress: string,
    @Param("mintAddress") mintAddress: string,
  ) {
    return this.tokensService.verifyNFTOwnership(ownerAddress, mintAddress);
  }

  @Post("freeze-account")
  @ApiOperation({ summary: "Freeze token account" })
  @ApiResponse({ status: 200, description: "Token account frozen successfully" })
  freezeTokenAccount(@Body() body: { freezeAuthorityPrivateKey: string; mintAddress: string; accountAddress: string }) {
    return this.tokensService.freezeTokenAccount(
      body.freezeAuthorityPrivateKey,
      body.mintAddress,
      body.accountAddress,
    );
  }

  @Post("thaw-account")
  @ApiOperation({ summary: "Thaw token account" })
  @ApiResponse({ status: 200, description: "Token account thawed successfully" })
  thawTokenAccount(@Body() body: { freezeAuthorityPrivateKey: string; mintAddress: string; accountAddress: string }) {
    return this.tokensService.thawTokenAccount(
      body.freezeAuthorityPrivateKey,
      body.mintAddress,
      body.accountAddress,
    );
  }

  @Post("delegate-account")
  @ApiOperation({ summary: "Delegate token account authority" })
  @ApiResponse({ status: 200, description: "Token account delegation set successfully" })
  delegateTokenAccount(@Body() body: { ownerPrivateKey: string; mintAddress: string; delegateAddress: string; amount: number }) {
    return this.tokensService.delegateTokenAccount(
      body.ownerPrivateKey,
      body.mintAddress,
      body.delegateAddress,
      body.amount,
    );
  }

  @Post("revoke-delegation")
  @ApiOperation({ summary: "Revoke token account delegation" })
  @ApiResponse({ status: 200, description: "Token account delegation revoked successfully" })
  revokeTokenDelegation(@Body() body: { ownerPrivateKey: string; mintAddress: string }) {
    return this.tokensService.revokeTokenDelegation(
      body.ownerPrivateKey,
      body.mintAddress,
    );
  }

  @Post("transfer-nft")
  @ApiOperation({ summary: "Transfer NFT" })
  @ApiResponse({ status: 200, description: "NFT transferred successfully" })
  transferNFT(@Body() body: { ownerPrivateKey: string; mintAddress: string; recipientAddress: string }) {
    return this.tokensService.transferNFT(
      body.ownerPrivateKey,
      body.mintAddress,
      body.recipientAddress,
    );
  }

  @Post("approve-spending")
  @ApiOperation({ summary: "Approve token spending by another account" })
  @ApiResponse({ status: 200, description: "Token spending approved successfully" })
  approveTokenSpending(@Body() body: { ownerPrivateKey: string; mintAddress: string; spenderAddress: string; amount: number }) {
    return this.tokensService.approveTokenSpending(
      body.ownerPrivateKey,
      body.mintAddress,
      body.spenderAddress,
      body.amount,
    );
  }

  @Post("revoke-approval")
  @ApiOperation({ summary: "Revoke token spending approval" })
  @ApiResponse({ status: 200, description: "Token spending approval revoked successfully" })
  revokeTokenApproval(@Body() body: { ownerPrivateKey: string; mintAddress: string }) {
    return this.tokensService.revokeTokenApproval(
      body.ownerPrivateKey,
      body.mintAddress,
    );
  }
}
