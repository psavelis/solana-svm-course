import { Controller, Get, Post, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FeeService, FeeEstimate, FeeRecommendation } from "./fee.service";
import {
  FeeOptimizationService,
  FeeOptimizationResult,
  UserFeePreferences,
} from "./fee-optimization.service";
import {
  GetFeeEstimateDto,
  GetFeeRecommendationsDto,
  ValidateFeeDto,
  OptimizeFeeDto,
  GetHistoricalAnalysisDto,
} from "./dto/fee.dto";
import { Transaction } from "@solana/web3.js";

@ApiTags("fee")
@Controller("fee")
/**
 * Controller for managing fee mechanisms and optimization.
 * @see docs/diagrams/05-fee-mechanism.md
 */
export class FeeController {
  constructor(
    private readonly feeService: FeeService,
    private readonly feeOptimizationService: FeeOptimizationService,
  ) {}

  @Get("estimate")
  @ApiOperation({ summary: "Get basic fee estimate for a transaction" })
  @ApiResponse({
    status: 200,
    description: "Fee estimate retrieved successfully",
    type: Object,
  })
  async getFeeEstimate(
    @Query() query: GetFeeEstimateDto,
  ): Promise<FeeEstimate> {
    let transaction: Transaction | undefined;

    if (query.transactionData) {
      try {
        // Deserialize transaction from base64
        const transactionBuffer = Buffer.from(query.transactionData, "base64");
        transaction = Transaction.from(transactionBuffer);
      } catch (error) {
        throw new Error("Invalid transaction data");
      }
    }

    return this.feeService.getFeeEstimate(transaction);
  }

  @Post("recommendations")
  @ApiOperation({
    summary: "Get in-depth fee recommendations with multiple priority levels",
  })
  @ApiResponse({
    status: 201,
    description: "Fee recommendations retrieved successfully",
    type: Object,
  })
  async getFeeRecommendations(
    @Body() dto: GetFeeRecommendationsDto,
  ): Promise<FeeRecommendation> {
    let transaction: Transaction | undefined;

    if (dto.transactionData) {
      try {
        // Deserialize transaction from base64
        const transactionBuffer = Buffer.from(dto.transactionData, "base64");
        transaction = Transaction.from(transactionBuffer);
      } catch (error) {
        throw new Error("Invalid transaction data");
      }
    }

    return this.feeService.getFeeRecommendations(transaction, {
      priorityLevel: dto.priorityLevel || "medium",
      includeVotes: dto.includeVotes || false,
    });
  }

  @Get("market-stats")
  @ApiOperation({
    summary: "Get current fee market statistics and network load",
  })
  @ApiResponse({
    status: 200,
    description: "Fee market statistics retrieved successfully",
    type: Object,
  })
  async getFeeMarketStats() {
    return this.feeService.getFeeMarketStats();
  }

  @Post("validate")
  @ApiOperation({ summary: "Validate if a fee estimate is reasonable" })
  @ApiResponse({
    status: 201,
    description: "Fee validation result",
    type: Boolean,
  })
  async validateFeeEstimate(@Body() dto: ValidateFeeDto): Promise<boolean> {
    const estimate: FeeEstimate = {
      baseFee: dto.baseFee || 5000,
      priorityFee: dto.priorityFee || 0,
      totalFee: dto.totalFee || (dto.baseFee || 5000) + (dto.priorityFee || 0),
      computeUnits: dto.computeUnits || 5000,
      feePayer: dto.feePayer || "",
    };

    return this.feeService.validateFeeEstimate(estimate);
  }

  @Post("optimize")
  @ApiOperation({
    summary: "Get optimized fee recommendations using advanced strategies",
  })
  @ApiResponse({
    status: 201,
    description: "Optimized fee recommendations retrieved successfully",
    type: Object,
  })
  async optimizeFee(
    @Body() dto: OptimizeFeeDto,
  ): Promise<FeeOptimizationResult> {
    let transaction: Transaction;

    try {
      // Deserialize transaction from base64
      const transactionBuffer = Buffer.from(dto.transactionData, "base64");
      transaction = Transaction.from(transactionBuffer);
    } catch (error) {
      throw new Error("Invalid transaction data");
    }

    const userPreferences: UserFeePreferences = {
      maxFeeLamports: dto.userPreferences?.maxFeeLamports,
      targetSuccessRate: dto.userPreferences?.targetSuccessRate,
      speed: dto.userPreferences?.speed || "normal",
      riskTolerance: dto.userPreferences?.riskTolerance || "moderate",
    };

    return this.feeOptimizationService.optimizeFee(
      transaction,
      userPreferences,
    );
  }

  @Get("strategies")
  @ApiOperation({ summary: "Get available fee optimization strategies" })
  @ApiResponse({
    status: 200,
    description: "Available strategies retrieved successfully",
    type: Array,
  })
  async getAvailableStrategies(): Promise<
    { name: string; description: string }[]
  > {
    return this.feeOptimizationService.getAvailableStrategies();
  }

  @Get("historical-analysis")
  @ApiOperation({ summary: "Get historical fee analysis and trends" })
  @ApiResponse({
    status: 200,
    description: "Historical fee analysis retrieved successfully",
    type: Object,
  })
  async getHistoricalFeeAnalysis(
    @Query() query: GetHistoricalAnalysisDto,
  ): Promise<{
    averageFee: number;
    feeVolatility: number;
    bestTimes: { hour: number; averageFee: number }[];
    trend: "increasing" | "decreasing" | "stable";
  }> {
    const hoursNum = query.hours || 24;
    return this.feeOptimizationService.getHistoricalFeeAnalysis(hoursNum);
  }
}
