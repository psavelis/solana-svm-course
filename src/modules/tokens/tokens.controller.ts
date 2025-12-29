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
}
