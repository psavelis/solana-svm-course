import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { FeeService, FeeEstimate, FeeRecommendation } from './fee.service';
import {
  FeeOptimizationService,
  FeeOptimizationResult,
  UserFeePreferences,
} from './fee-optimization.service';
import {
  GetFeeEstimateDto,
  GetFeeRecommendationsDto,
  ValidateFeeDto,
  OptimizeFeeDto,
  GetHistoricalAnalysisDto,
} from './dto/fee.dto';
import { Transaction } from '@solana/web3.js';

/**
 * # Fee Controller
 *
 * REST API for fee estimation, optimization, and market analysis.
 *
 * ## Solana Fee Model
 *
 * Solana fees consist of two components:
 *
 * ### Base Fee (Signature Fee)
 * - Fixed: 5,000 lamports per signature (~$0.00025)
 * - Paid regardless of transaction complexity
 * - Burned (not paid to validators)
 *
 * ### Priority Fee (Compute Unit Price)
 * - Variable: micro-lamports per compute unit
 * - Paid to validator for faster inclusion
 * - Higher during network congestion
 *
 * ```
 * Total Fee = (Base Fee × Signatures) + (CU Price × CUs Used)
 * ```
 *
 * ## Priority Fee Levels
 *
 * | Level | Use Case | Typical CU Price |
 * |-------|----------|------------------|
 * | Low | Non-urgent txs | 0-1,000 |
 * | Medium | Normal txs | 1,000-10,000 |
 * | High | Time-sensitive | 10,000-100,000 |
 * | Turbo | NFT mints, arb | 100,000+ |
 *
 * ## Fee Optimization Strategies
 *
 * This API provides:
 * - Real-time fee market analysis
 * - Historical fee patterns
 * - Transaction-specific recommendations
 * - Success rate predictions
 *
 * @example
 * ```typescript
 * // Get fee estimate
 * GET /fee/estimate?transactionData=base64-tx
 *
 * // Get recommendations with priority
 * POST /fee/recommendations
 * {
 *   "transactionData": "base64-serialized-tx",
 *   "priorityLevel": "high"
 * }
 *
 * // Optimize fee for specific preferences
 * POST /fee/optimize
 * {
 *   "transactionData": "base64-tx",
 *   "userPreferences": {
 *     "maxFeeLamports": 100000,
 *     "targetSuccessRate": 0.95,
 *     "speed": "fast"
 *   }
 * }
 * ```
 *
 * @see https://docs.solana.com/transaction_fees - Transaction Fees
 * @see https://docs.solana.com/developing/programming-model/runtime#prioritization-fees - Priority Fees
 * @see [docs/diagrams/05-fee-mechanism.md](docs/diagrams/05-fee-mechanism.md) - Architecture
 */
@ApiTags('fee')
@Controller('fee')
export class FeeController {
  constructor(
    private readonly feeService: FeeService,
    private readonly feeOptimizationService: FeeOptimizationService,
  ) {}

  @Get('estimate')
  @ApiOperation({ summary: 'Get basic fee estimate for a transaction' })
  @ApiResponse({
    status: 200,
    description: 'Fee estimate retrieved successfully',
    type: Object,
  })
  async getFeeEstimate(@Query() query: GetFeeEstimateDto): Promise<FeeEstimate> {
    let transaction: Transaction | undefined;

    if (query.transactionData) {
      try {
        // Deserialize transaction from base64
        const transactionBuffer = Buffer.from(query.transactionData, 'base64');
        transaction = Transaction.from(transactionBuffer);
      } catch (error) {
        throw new Error('Invalid transaction data');
      }
    }

    return this.feeService.getFeeEstimate(transaction);
  }

  @Post('recommendations')
  @ApiOperation({
    summary: 'Get in-depth fee recommendations with multiple priority levels',
  })
  @ApiResponse({
    status: 201,
    description: 'Fee recommendations retrieved successfully',
    type: Object,
  })
  async getFeeRecommendations(@Body() dto: GetFeeRecommendationsDto): Promise<FeeRecommendation> {
    let transaction: Transaction | undefined;

    if (dto.transactionData) {
      try {
        // Deserialize transaction from base64
        const transactionBuffer = Buffer.from(dto.transactionData, 'base64');
        transaction = Transaction.from(transactionBuffer);
      } catch (error) {
        throw new Error('Invalid transaction data');
      }
    }

    return this.feeService.getFeeRecommendations(transaction, {
      priorityLevel: dto.priorityLevel || 'medium',
      includeVotes: dto.includeVotes || false,
    });
  }

  @Get('market-stats')
  @ApiOperation({
    summary: 'Get current fee market statistics and network load',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee market statistics retrieved successfully',
    type: Object,
  })
  async getFeeMarketStats() {
    return this.feeService.getFeeMarketStats();
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate if a fee estimate is reasonable' })
  @ApiResponse({
    status: 201,
    description: 'Fee validation result',
    type: Boolean,
  })
  async validateFeeEstimate(@Body() dto: ValidateFeeDto): Promise<boolean> {
    const estimate: FeeEstimate = {
      baseFee: dto.baseFee || 5000,
      priorityFee: dto.priorityFee || 0,
      totalFee: dto.totalFee || (dto.baseFee || 5000) + (dto.priorityFee || 0),
      computeUnits: dto.computeUnits || 5000,
      feePayer: dto.feePayer || '',
    };

    return this.feeService.validateFeeEstimate(estimate);
  }

  @Post('optimize')
  @ApiOperation({
    summary: 'Get optimized fee recommendations using advanced strategies',
  })
  @ApiResponse({
    status: 201,
    description: 'Optimized fee recommendations retrieved successfully',
    type: Object,
  })
  async optimizeFee(@Body() dto: OptimizeFeeDto): Promise<FeeOptimizationResult> {
    let transaction: Transaction;

    try {
      // Deserialize transaction from base64
      const transactionBuffer = Buffer.from(dto.transactionData, 'base64');
      transaction = Transaction.from(transactionBuffer);
    } catch (error) {
      throw new Error('Invalid transaction data');
    }

    const userPreferences: UserFeePreferences = {
      maxFeeLamports: dto.userPreferences?.maxFeeLamports,
      targetSuccessRate: dto.userPreferences?.targetSuccessRate,
      speed: dto.userPreferences?.speed || 'normal',
      riskTolerance: dto.userPreferences?.riskTolerance || 'moderate',
    };

    return this.feeOptimizationService.optimizeFee(transaction, userPreferences);
  }

  @Get('strategies')
  @ApiOperation({ summary: 'Get available fee optimization strategies' })
  @ApiResponse({
    status: 200,
    description: 'Available strategies retrieved successfully',
    type: Array,
  })
  async getAvailableStrategies(): Promise<{ name: string; description: string }[]> {
    return this.feeOptimizationService.getAvailableStrategies();
  }

  @Get('historical-analysis')
  @ApiOperation({ summary: 'Get historical fee analysis and trends' })
  @ApiResponse({
    status: 200,
    description: 'Historical fee analysis retrieved successfully',
    type: Object,
  })
  async getHistoricalFeeAnalysis(@Query() query: GetHistoricalAnalysisDto): Promise<{
    averageFee: number;
    feeVolatility: number;
    bestTimes: { hour: number; averageFee: number }[];
    trend: 'increasing' | 'decreasing' | 'stable';
  }> {
    const hoursNum = query.hours || 24;
    return this.feeOptimizationService.getHistoricalFeeAnalysis(hoursNum);
  }
}
