import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { CpiService } from "./cpi.service";
import { CreateCpiInstructionDto } from "./dto/create-cpi-instruction.dto";
import {
  CreateCpiPermissionDto,
  UpdateCpiPermissionDto,
} from "./dto/cpi-permission.dto";
import { CreateCpiInvocationDto } from "./dto/cpi-invocation.dto";
import { DexService } from "./dex.service";
import { LendingService } from "./lending.service";
import { NFTMarketplaceCpiService } from "./nft-marketplace-cpi.service";

@ApiTags("CPI (Cross-Program Invocations)")
@Controller("cpi")
/**
 * Controller for Cross-Program Invocations (CPI).
 * @see docs/diagrams/10-cpis.md
 */
export class CpiController {
  constructor(
    private readonly cpiService: CpiService,
    private readonly dexService: DexService,
    private readonly lendingService: LendingService,
    private readonly nftMarketplaceCpiService: NFTMarketplaceCpiService,
  ) {}

  @Post("instructions")
  @ApiOperation({ summary: "Create a CPI instruction template" })
  @ApiResponse({
    status: 201,
    description: "CPI instruction created successfully",
  })
  async createInstruction(@Body() dto: CreateCpiInstructionDto) {
    return await this.cpiService.createInstruction(dto);
  }

  @Get("instructions/:programId")
  @ApiOperation({ summary: "Get CPI instructions for a program" })
  @ApiResponse({
    status: 200,
    description: "CPI instructions retrieved successfully",
  })
  async getInstructionsByProgram(@Param("programId") programId: string) {
    return await this.cpiService.getInstructionsByProgram(programId);
  }

  @Post("permissions")
  @ApiOperation({ summary: "Create a CPI permission" })
  @ApiResponse({
    status: 201,
    description: "CPI permission created successfully",
  })
  async createPermission(@Body() dto: CreateCpiPermissionDto) {
    return await this.cpiService.createPermission(dto);
  }

  @Put("permissions/:id")
  @ApiOperation({ summary: "Update a CPI permission" })
  @ApiResponse({
    status: 200,
    description: "CPI permission updated successfully",
  })
  async updatePermission(
    @Param("id") id: string,
    @Body() dto: UpdateCpiPermissionDto,
  ) {
    return await this.cpiService.updatePermission(id, dto);
  }

  @Post("execute")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Execute a CPI call" })
  @ApiResponse({ status: 200, description: "CPI executed successfully" })
  async executeCpi(@Body() dto: CreateCpiInvocationDto) {
    return await this.cpiService.executeCpi(dto);
  }

  @Get("history")
  @ApiOperation({ summary: "Get CPI invocation history" })
  @ApiResponse({
    status: 200,
    description: "CPI history retrieved successfully",
  })
  async getInvocationHistory(
    @Query("programId") programId?: string,
    @Query("callerProgramId") callerProgramId?: string,
    @Query("limit") limit?: number,
  ) {
    return await this.cpiService.getInvocationHistory(
      programId,
      callerProgramId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  @Post("check-permission")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check if a program has CPI permission" })
  @ApiResponse({ status: 200, description: "Permission check completed" })
  async checkPermission(
    @Body()
    body: {
      callerProgramId: string;
      targetProgramId: string;
      permissionType?: string;
      accountId?: string;
    },
  ) {
    const hasPermission = await this.cpiService.checkPermission(
      body.callerProgramId,
      body.targetProgramId,
      body.permissionType || "invoke",
      body.accountId,
    );

    return { hasPermission };
  }

  @Post("dex/swap")
  @ApiOperation({ summary: "Perform a DEX swap" })
  @ApiResponse({
    status: 201,
    description: "DEX swap executed successfully",
  })
  async performDexSwap(
    @Body()
    body: {
      privateKey: string;
      poolAddress: string;
      amountIn: number;
      direction: string;
      slippageTolerance?: number;
    },
  ) {
    return await this.dexService.performSwap(
      body.privateKey,
      body.poolAddress,
      body.amountIn,
      body.direction as any,
      body.slippageTolerance,
    );
  }

  @Post("dex/pools")
  @ApiOperation({ summary: "Create or update a DEX pool" })
  @ApiResponse({
    status: 201,
    description: "DEX pool created/updated successfully",
  })
  async createOrUpdatePool(
    @Body()
    body: {
      poolAddress: string;
      dexType: string;
      dexProgramId: string;
      tokenAMint: string;
      tokenBMint: string;
      tokenABalance: number;
      tokenBBalance: number;
      feeRate?: number;
      metadata?: any;
    },
  ) {
    return await this.dexService.createOrUpdatePool(
      body.poolAddress,
      body.dexType as any,
      body.dexProgramId,
      body.tokenAMint,
      body.tokenBMint,
      body.tokenABalance,
      body.tokenBBalance,
      body.feeRate,
      body.metadata,
    );
  }

  @Get("dex/pools/:poolAddress")
  @ApiOperation({ summary: "Get DEX pool information" })
  @ApiResponse({
    status: 200,
    description: "DEX pool information retrieved successfully",
  })
  async getPool(@Param("poolAddress") poolAddress: string) {
    return await this.dexService.getPool(poolAddress);
  }

  @Get("dex/pools")
  @ApiOperation({ summary: "Get DEX pools by token pair" })
  @ApiResponse({
    status: 200,
    description: "DEX pools retrieved successfully",
  })
  async getPoolsByTokens(
    @Query("tokenA") tokenA: string,
    @Query("tokenB") tokenB: string,
  ) {
    return await this.dexService.getPoolsByTokens(tokenA, tokenB);
  }

  @Post("dex/liquidity/add")
  @ApiOperation({ summary: "Add liquidity to a DEX pool" })
  @ApiResponse({
    status: 201,
    description: "Liquidity added successfully",
  })
  async addLiquidity(
    @Body()
    body: {
      privateKey: string;
      poolAddress: string;
      tokenAAmount: number;
      tokenBAmount: number;
      positionType?: string;
    },
  ) {
    return await this.dexService.addLiquidity(
      body.privateKey,
      body.poolAddress,
      body.tokenAAmount,
      body.tokenBAmount,
      body.positionType as any,
    );
  }

  @Post("dex/liquidity/remove")
  @ApiOperation({ summary: "Remove liquidity from a DEX pool" })
  @ApiResponse({
    status: 200,
    description: "Liquidity removed successfully",
  })
  async removeLiquidity(
    @Body()
    body: {
      privateKey: string;
      positionId: string;
      percentage?: number;
    },
  ) {
    return await this.dexService.removeLiquidity(
      body.privateKey,
      body.positionId,
      body.percentage,
    );
  }

  @Get("dex/positions/:userAddress")
  @ApiOperation({ summary: "Get user's liquidity positions" })
  @ApiResponse({
    status: 200,
    description: "Liquidity positions retrieved successfully",
  })
  async getUserPositions(@Param("userAddress") userAddress: string) {
    return await this.dexService.getUserPositions(userAddress);
  }

  @Get("dex/swaps/:userAddress")
  @ApiOperation({ summary: "Get user's swap history" })
  @ApiResponse({
    status: 200,
    description: "Swap history retrieved successfully",
  })
  async getUserSwapHistory(@Param("userAddress") userAddress: string) {
    return await this.dexService.getUserSwapHistory(userAddress);
  }

  @Get("dex/pools/:poolAddress/stats")
  @ApiOperation({ summary: "Get DEX pool statistics" })
  @ApiResponse({
    status: 200,
    description: "Pool statistics retrieved successfully",
  })
  async getPoolStats(@Param("poolAddress") poolAddress: string) {
    return await this.dexService.getPoolStats(poolAddress);
  }

  // Lending Protocol Endpoints

  @Post("lending/pools")
  @ApiOperation({ summary: "Create or update a lending pool" })
  @ApiResponse({
    status: 201,
    description: "Lending pool created/updated successfully",
  })
  async createOrUpdateLendingPool(
    @Body()
    body: {
      poolAddress: string;
      poolType: string;
      lendingProgramId: string;
      ownerAddress: string;
      reserves: any[];
      metadata?: any;
    },
  ) {
    return await this.lendingService.createOrUpdatePool(
      body.poolAddress,
      body.poolType as any,
      body.lendingProgramId,
      body.ownerAddress,
      body.reserves,
      body.metadata,
    );
  }

  @Get("lending/pools/:poolAddress")
  @ApiOperation({ summary: "Get lending pool information" })
  @ApiResponse({
    status: 200,
    description: "Lending pool information retrieved successfully",
  })
  async getLendingPool(@Param("poolAddress") poolAddress: string) {
    return await this.lendingService.getPool(poolAddress);
  }

  @Post("lending/supply")
  @ApiOperation({ summary: "Supply assets to a lending pool" })
  @ApiResponse({
    status: 201,
    description: "Assets supplied successfully",
  })
  async supplyToPool(
    @Body()
    body: {
      privateKey: string;
      poolAddress: string;
      assetMint: string;
      amount: number;
    },
  ) {
    return await this.lendingService.supplyToPool(
      body.privateKey,
      body.poolAddress,
      body.assetMint,
      body.amount,
    );
  }

  @Post("lending/borrow")
  @ApiOperation({ summary: "Borrow assets from a lending pool" })
  @ApiResponse({
    status: 201,
    description: "Assets borrowed successfully",
  })
  async borrowFromPool(
    @Body()
    body: {
      privateKey: string;
      poolAddress: string;
      assetMint: string;
      amount: number;
      collateralMint: string;
      collateralAmount: number;
    },
  ) {
    return await this.lendingService.borrowFromPool(
      body.privateKey,
      body.poolAddress,
      body.assetMint,
      body.amount,
      body.collateralMint,
      body.collateralAmount,
    );
  }

  @Post("lending/repay")
  @ApiOperation({ summary: "Repay borrowed assets" })
  @ApiResponse({
    status: 200,
    description: "Borrow repaid successfully",
  })
  async repayBorrow(
    @Body()
    body: {
      privateKey: string;
      positionId: string;
      repayAmount: number;
    },
  ) {
    return await this.lendingService.repayBorrow(
      body.privateKey,
      body.positionId,
      body.repayAmount,
    );
  }

  @Post("lending/withdraw")
  @ApiOperation({ summary: "Withdraw supplied assets" })
  @ApiResponse({
    status: 200,
    description: "Assets withdrawn successfully",
  })
  async withdrawSupply(
    @Body()
    body: {
      privateKey: string;
      positionId: string;
      withdrawAmount: number;
    },
  ) {
    return await this.lendingService.withdrawSupply(
      body.privateKey,
      body.positionId,
      body.withdrawAmount,
    );
  }

  @Get("lending/positions/:userAddress")
  @ApiOperation({ summary: "Get user's lending positions" })
  @ApiResponse({
    status: 200,
    description: "Lending positions retrieved successfully",
  })
  async getUserLendingPositions(@Param("userAddress") userAddress: string) {
    return await this.lendingService.getUserPositions(userAddress);
  }

  @Get("lending/pools/:poolAddress/stats")
  @ApiOperation({ summary: "Get lending pool statistics" })
  @ApiResponse({
    status: 200,
    description: "Pool statistics retrieved successfully",
  })
  async getLendingPoolStats(@Param("poolAddress") poolAddress: string) {
    return await this.lendingService.getPoolStats(poolAddress);
  }

  // NFT Marketplace CPI Endpoints

  @Post("nft-marketplace/list")
  @ApiOperation({ summary: "List NFT on external marketplace via CPI" })
  @ApiResponse({
    status: 201,
    description: "NFT listed successfully on external marketplace",
  })
  async listNFTOnMarketplace(
    @Body()
    body: {
      privateKey: string;
      marketplace: string;
      nftMint: string;
      price: number;
      auctionHouse?: string;
      expiry?: number;
    },
  ) {
    return await this.nftMarketplaceCpiService.listNFTOnMarketplace(
      body.privateKey,
      {
        marketplace: body.marketplace as any,
        nftMint: body.nftMint,
        seller: "", // Will be derived from private key
        price: body.price,
        auctionHouse: body.auctionHouse,
        expiry: body.expiry,
      },
    );
  }

  @Post("nft-marketplace/bid")
  @ApiOperation({ summary: "Place bid on NFT via CPI" })
  @ApiResponse({
    status: 201,
    description: "Bid placed successfully on external marketplace",
  })
  async placeBidOnMarketplace(
    @Body()
    body: {
      privateKey: string;
      marketplace: string;
      nftMint: string;
      bidAmount: number;
      auctionHouse?: string;
    },
  ) {
    return await this.nftMarketplaceCpiService.placeBidOnMarketplace(
      body.privateKey,
      {
        marketplace: body.marketplace as any,
        nftMint: body.nftMint,
        bidder: "", // Will be derived from private key
        bidAmount: body.bidAmount,
        auctionHouse: body.auctionHouse,
      },
    );
  }

  @Post("nft-marketplace/sell")
  @ApiOperation({ summary: "Execute NFT sale via CPI" })
  @ApiResponse({
    status: 201,
    description: "NFT sale executed successfully",
  })
  async executeNFTSale(
    @Body()
    body: {
      privateKey: string;
      marketplace: string;
      nftMint: string;
      buyer: string;
      salePrice: number;
      auctionHouse?: string;
      royaltyPaid?: number;
    },
  ) {
    return await this.nftMarketplaceCpiService.executeNFTSale(
      body.privateKey,
      {
        marketplace: body.marketplace as any,
        nftMint: body.nftMint,
        seller: "", // Will be derived from private key
        buyer: body.buyer,
        salePrice: body.salePrice,
        auctionHouse: body.auctionHouse,
        royaltyPaid: body.royaltyPaid,
      },
    );
  }

  @Post("nft-marketplace/cancel")
  @ApiOperation({ summary: "Cancel NFT listing via CPI" })
  @ApiResponse({
    status: 200,
    description: "NFT listing canceled successfully",
  })
  async cancelNFTListing(
    @Body()
    body: {
      privateKey: string;
      marketplace: string;
      nftMint: string;
      auctionHouse?: string;
    },
  ) {
    return await this.nftMarketplaceCpiService.cancelNFTListing(
      body.privateKey,
      body.marketplace as any,
      body.nftMint,
      body.auctionHouse,
    );
  }

  @Post("nft-marketplace/update")
  @ApiOperation({ summary: "Update NFT listing price via CPI" })
  @ApiResponse({
    status: 200,
    description: "NFT listing updated successfully",
  })
  async updateNFTListing(
    @Body()
    body: {
      privateKey: string;
      marketplace: string;
      nftMint: string;
      newPrice: number;
      auctionHouse?: string;
    },
  ) {
    return await this.nftMarketplaceCpiService.updateNFTListing(
      body.privateKey,
      body.marketplace as any,
      body.nftMint,
      body.newPrice,
      body.auctionHouse,
    );
  }

  @Get("nft-marketplace/supported")
  @ApiOperation({ summary: "Get supported NFT marketplaces" })
  @ApiResponse({
    status: 200,
    description: "List of supported marketplaces",
  })
  async getSupportedMarketplaces() {
    return this.nftMarketplaceCpiService.getSupportedMarketplaces();
  }
}
