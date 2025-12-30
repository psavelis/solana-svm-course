import { Injectable, Logger } from "@nestjs/common";
import { Connection, Transaction, PublicKey } from "@solana/web3.js";
import { FeeService, FeeEstimate, FeeRecommendation } from "../fee/fee.service";

export interface FeeOptimizationStrategy {
  name: string;
  description: string;
  calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult>;
}

export interface NetworkConditions {
  congestion: "low" | "medium" | "high";
  recentBlockTime: number;
  priorityFeePercentile: number;
  networkLoad: number;
  recentTransactionSuccessRate: number;
}

export interface UserFeePreferences {
  maxFeeLamports?: number;
  targetSuccessRate?: number; // 0-1
  speed: "slow" | "normal" | "fast" | "urgent";
  riskTolerance: "conservative" | "moderate" | "aggressive";
}

export interface OptimizedFeeResult {
  recommendedFee: FeeEstimate;
  strategy: string;
  confidence: number; // 0-1, how confident we are in success
  estimatedSuccessRate: number;
  estimatedConfirmationTime: number; // seconds
  alternativeOptions: FeeEstimate[];
  reasoning: string[];
}

export interface FeeOptimizationResult {
  optimalFee: OptimizedFeeResult;
  alternatives: OptimizedFeeResult[];
  networkAnalysis: NetworkConditions;
  recommendations: string[];
}

@Injectable()
export class FeeOptimizationService {
  private readonly logger = new Logger(FeeOptimizationService.name);
  private readonly strategies: FeeOptimizationStrategy[] = [];
  private connection: Connection;

  constructor(private readonly feeService: FeeService) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );
    this.initializeStrategies();
  }

  /**
   * Initialize fee optimization strategies
   */
  private initializeStrategies(): void {
    this.strategies.push(
      new ConservativeFeeStrategy(),
      new BalancedFeeStrategy(),
      new AggressiveFeeStrategy(),
      new PredictiveFeeStrategy(),
      new AdaptiveFeeStrategy(),
    );
  }

  /**
   * Get optimal fee for a transaction based on strategy and conditions
   */
  async optimizeFee(
    transaction: Transaction,
    userPreferences: UserFeePreferences = {
      speed: "normal",
      riskTolerance: "moderate",
    },
  ): Promise<FeeOptimizationResult> {
    try {
      // Analyze current network conditions
      const networkConditions = await this.analyzeNetworkConditions();

      // Get base fee recommendations
      const baseRecommendations =
        await this.feeService.getFeeRecommendations(transaction);

      // Apply optimization strategies
      const optimizationResults = await Promise.all(
        this.strategies.map((strategy) =>
          strategy.calculateOptimalFee(
            transaction,
            networkConditions,
            userPreferences,
          ),
        ),
      );

      // Select best strategy based on user preferences
      const optimalFee = this.selectOptimalStrategy(
        optimizationResults,
        userPreferences,
      );

      // Generate alternative options
      const alternatives = optimizationResults
        .filter((result) => result !== optimalFee)
        .slice(0, 2); // Top 2 alternatives

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        optimalFee,
        networkConditions,
        userPreferences,
      );

      return {
        optimalFee,
        alternatives,
        networkAnalysis: networkConditions,
        recommendations,
      };
    } catch (error) {
      this.logger.error("Failed to optimize fee", error);
      throw new Error(`Fee optimization failed: ${error.message}`);
    }
  }

  /**
   * Analyze current network conditions
   */
  private async analyzeNetworkConditions(): Promise<NetworkConditions> {
    try {
      // Get congestion level
      const feeStats = await this.feeService.getFeeMarketStats();

      // Get recent block time
      const slot = await this.connection.getSlot();
      const block = await this.connection.getConfirmedBlock(slot - 1);
      const recentBlockTime = block?.blockTime || Date.now() / 1000;

      // Estimate transaction success rate (simplified)
      const recentTransactionSuccessRate =
        await this.calculateRecentSuccessRate();

      return {
        congestion:
          feeStats.networkLoad > 0.7
            ? "high"
            : feeStats.networkLoad > 0.4
              ? "medium"
              : "low",
        recentBlockTime,
        priorityFeePercentile: feeStats.percentile95,
        networkLoad: feeStats.networkLoad,
        recentTransactionSuccessRate,
      };
    } catch (error) {
      this.logger.warn(
        "Failed to analyze network conditions, using defaults",
        error,
      );
      return {
        congestion: "medium",
        recentBlockTime: Date.now() / 1000,
        priorityFeePercentile: 0.000002,
        networkLoad: 0.5,
        recentTransactionSuccessRate: 0.95,
      };
    }
  }

  /**
   * Calculate recent transaction success rate
   */
  private async calculateRecentSuccessRate(): Promise<number> {
    try {
      const slot = await this.connection.getSlot();
      let successCount = 0;
      let totalCount = 0;

      // Check last 5 blocks
      for (let i = 1; i <= 5; i++) {
        try {
          const block = await this.connection.getConfirmedBlock(slot - i);
          if (block?.transactions) {
            totalCount += block.transactions.length;
            successCount += block.transactions.filter(
              (tx) => tx.meta?.err === null,
            ).length;
          }
        } catch (error) {
          continue;
        }
      }

      return totalCount > 0 ? successCount / totalCount : 0.95;
    } catch (error) {
      return 0.95; // Default success rate
    }
  }

  /**
   * Select optimal strategy based on user preferences
   */
  private selectOptimalStrategy(
    results: OptimizedFeeResult[],
    preferences: UserFeePreferences,
  ): OptimizedFeeResult {
    // Score each result based on user preferences
    const scoredResults = results.map((result) => ({
      result,
      score: this.scoreResult(result, preferences),
    }));

    // Return highest scoring result
    return scoredResults.sort((a, b) => b.score - a.score)[0].result;
  }

  /**
   * Score a fee optimization result based on user preferences
   */
  private scoreResult(
    result: OptimizedFeeResult,
    preferences: UserFeePreferences,
  ): number {
    let score = 0;

    // Success rate preference
    const targetSuccessRate = preferences.targetSuccessRate || 0.95;
    const successRateDiff = Math.abs(
      result.estimatedSuccessRate - targetSuccessRate,
    );
    score += (1 - successRateDiff) * 40; // 40% weight on success rate

    // Speed preference
    const speedMultiplier = {
      slow: 0.5,
      normal: 1.0,
      fast: 1.5,
      urgent: 2.0,
    }[preferences.speed];

    const confirmationTimeScore =
      Math.max(0, 60 - result.estimatedConfirmationTime) / 60; // Normalize to 0-1
    score += confirmationTimeScore * speedMultiplier * 30; // 30% weight on speed

    // Cost preference (lower cost is better, but balanced with success)
    const maxFee = preferences.maxFeeLamports || 100000; // 0.0001 SOL default
    const costEfficiency = Math.max(
      0,
      1 - result.recommendedFee.totalFee / maxFee,
    );
    score += costEfficiency * 20; // 20% weight on cost

    // Confidence bonus
    score += result.confidence * 10; // 10% weight on confidence

    return score;
  }

  /**
   * Generate human-readable recommendations
   */
  private generateRecommendations(
    optimalFee: OptimizedFeeResult,
    networkConditions: NetworkConditions,
    preferences: UserFeePreferences,
  ): string[] {
    const recommendations: string[] = [];

    // Network condition recommendations
    if (networkConditions.congestion === "high") {
      recommendations.push(
        "Network is congested. Consider using higher priority fees for faster confirmation.",
      );
    } else if (networkConditions.congestion === "low") {
      recommendations.push(
        "Network activity is low. You may be able to use lower fees.",
      );
    }

    // Success rate recommendations
    if (optimalFee.estimatedSuccessRate < 0.9) {
      recommendations.push(
        "Estimated success rate is below 90%. Consider increasing fees or waiting for network conditions to improve.",
      );
    }

    // Cost optimization recommendations
    if (optimalFee.recommendedFee.totalFee > 50000) {
      // 0.00005 SOL
      recommendations.push(
        "Recommended fee is relatively high. Monitor transaction status and consider alternatives if cost is a concern.",
      );
    }

    // Speed recommendations
    if (
      preferences.speed === "urgent" &&
      optimalFee.estimatedConfirmationTime > 30
    ) {
      recommendations.push(
        'For urgent transactions, consider using the "aggressive" alternative option.',
      );
    }

    return recommendations;
  }

  /**
   * Get fee optimization strategies
   */
  getAvailableStrategies(): { name: string; description: string }[] {
    return this.strategies.map((strategy) => ({
      name: strategy.name,
      description: strategy.description,
    }));
  }

  /**
   * Get historical fee analysis
   */
  async getHistoricalFeeAnalysis(hours: number = 24): Promise<{
    averageFee: number;
    feeVolatility: number;
    bestTimes: { hour: number; averageFee: number }[];
    trend: "increasing" | "decreasing" | "stable";
  }> {
    // This would analyze historical fee data
    // For now, return mock data
    return {
      averageFee: 0.000001,
      feeVolatility: 0.3,
      bestTimes: [
        { hour: 2, averageFee: 0.0000005 },
        { hour: 14, averageFee: 0.0000008 },
      ],
      trend: "stable",
    };
  }
}

/**
 * Conservative Fee Strategy - Prioritizes reliability over cost
 */
class ConservativeFeeStrategy implements FeeOptimizationStrategy {
  name = "conservative";
  description =
    "Prioritizes transaction success with higher fees for reliability";

  async calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult> {
    const baseFee = 5000; // Base fee per signature
    const priorityMultiplier =
      networkConditions.congestion === "high"
        ? 3.0
        : networkConditions.congestion === "medium"
          ? 2.0
          : 1.5;

    const priorityFee = Math.floor(
      networkConditions.priorityFeePercentile * priorityMultiplier,
    );
    const totalFee = baseFee + priorityFee;

    const estimatedSuccessRate = Math.min(
      0.98,
      networkConditions.recentTransactionSuccessRate + 0.1,
    );
    const estimatedConfirmationTime =
      networkConditions.congestion === "high"
        ? 15
        : networkConditions.congestion === "medium"
          ? 30
          : 60;

    return {
      recommendedFee: {
        baseFee,
        priorityFee,
        totalFee,
        computeUnits: 5000,
        feePayer: transaction.feePayer?.toString() || "",
      },
      strategy: this.name,
      confidence: 0.9,
      estimatedSuccessRate,
      estimatedConfirmationTime,
      alternativeOptions: [],
      reasoning: [
        "Uses higher fee multipliers for network congestion",
        "Prioritizes transaction success over cost savings",
        "Suitable for important transactions requiring high reliability",
      ],
    };
  }
}

/**
 * Balanced Fee Strategy - Balances cost and speed
 */
class BalancedFeeStrategy implements FeeOptimizationStrategy {
  name = "balanced";
  description = "Balances cost efficiency with reasonable confirmation times";

  async calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult> {
    const baseFee = 5000;
    const priorityMultiplier =
      networkConditions.congestion === "high"
        ? 2.0
        : networkConditions.congestion === "medium"
          ? 1.5
          : 1.0;

    const priorityFee = Math.floor(
      networkConditions.priorityFeePercentile * priorityMultiplier,
    );
    const totalFee = baseFee + priorityFee;

    const estimatedSuccessRate = networkConditions.recentTransactionSuccessRate;
    const estimatedConfirmationTime =
      networkConditions.congestion === "high"
        ? 30
        : networkConditions.congestion === "medium"
          ? 45
          : 90;

    return {
      recommendedFee: {
        baseFee,
        priorityFee,
        totalFee,
        computeUnits: 5000,
        feePayer: transaction.feePayer?.toString() || "",
      },
      strategy: this.name,
      confidence: 0.8,
      estimatedSuccessRate,
      estimatedConfirmationTime,
      alternativeOptions: [],
      reasoning: [
        "Uses moderate fee multipliers based on network conditions",
        "Balances cost and confirmation time",
        "Good default choice for most transactions",
      ],
    };
  }
}

/**
 * Aggressive Fee Strategy - Prioritizes speed over cost
 */
class AggressiveFeeStrategy implements FeeOptimizationStrategy {
  name = "aggressive";
  description = "Uses higher fees for fastest possible confirmation";

  async calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult> {
    const baseFee = 5000;
    const priorityMultiplier =
      networkConditions.congestion === "high"
        ? 5.0
        : networkConditions.congestion === "medium"
          ? 3.0
          : 2.0;

    const priorityFee = Math.floor(
      networkConditions.priorityFeePercentile * priorityMultiplier,
    );
    const totalFee = baseFee + priorityFee;

    const estimatedSuccessRate = Math.min(
      0.99,
      networkConditions.recentTransactionSuccessRate + 0.05,
    );
    const estimatedConfirmationTime =
      networkConditions.congestion === "high"
        ? 5
        : networkConditions.congestion === "medium"
          ? 10
          : 20;

    return {
      recommendedFee: {
        baseFee,
        priorityFee,
        totalFee,
        computeUnits: 5000,
        feePayer: transaction.feePayer?.toString() || "",
      },
      strategy: this.name,
      confidence: 0.95,
      estimatedSuccessRate,
      estimatedConfirmationTime,
      alternativeOptions: [],
      reasoning: [
        "Uses highest fee multipliers for maximum priority",
        "Prioritizes speed over cost efficiency",
        "Best for time-sensitive transactions",
      ],
    };
  }
}

/**
 * Predictive Fee Strategy - Uses historical data and ML-like predictions
 */
class PredictiveFeeStrategy implements FeeOptimizationStrategy {
  name = "predictive";
  description = "Uses historical patterns to predict optimal fees";

  async calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult> {
    // Simplified predictive logic based on network patterns
    const baseFee = 5000;
    const timeOfDay = new Date().getHours();

    // Adjust fees based on time of day (simplified model)
    let timeMultiplier = 1.0;
    if (timeOfDay >= 9 && timeOfDay <= 17) {
      // Business hours
      timeMultiplier = 1.3;
    } else if (timeOfDay >= 20 && timeOfDay <= 6) {
      // Off-peak hours
      timeMultiplier = 0.8;
    }

    const congestionMultiplier =
      networkConditions.congestion === "high"
        ? 2.5
        : networkConditions.congestion === "medium"
          ? 1.8
          : 1.2;

    const priorityFee = Math.floor(
      networkConditions.priorityFeePercentile *
        timeMultiplier *
        congestionMultiplier,
    );
    const totalFee = baseFee + priorityFee;

    const estimatedSuccessRate = Math.min(
      0.97,
      networkConditions.recentTransactionSuccessRate + 0.02,
    );
    const estimatedConfirmationTime = Math.floor(
      (networkConditions.congestion === "high"
        ? 20
        : networkConditions.congestion === "medium"
          ? 35
          : 70) / timeMultiplier,
    );

    return {
      recommendedFee: {
        baseFee,
        priorityFee,
        totalFee,
        computeUnits: 5000,
        feePayer: transaction.feePayer?.toString() || "",
      },
      strategy: this.name,
      confidence: 0.85,
      estimatedSuccessRate,
      estimatedConfirmationTime,
      alternativeOptions: [],
      reasoning: [
        "Analyzes time-of-day patterns for fee optimization",
        "Uses historical network data for predictions",
        "Adapts to both congestion and temporal patterns",
      ],
    };
  }
}

/**
 * Adaptive Fee Strategy - Dynamically adjusts based on recent transaction outcomes
 */
class AdaptiveFeeStrategy implements FeeOptimizationStrategy {
  name = "adaptive";
  description =
    "Adapts fees based on recent transaction success/failure patterns";

  async calculateOptimalFee(
    transaction: Transaction,
    networkConditions: NetworkConditions,
    userPreferences: UserFeePreferences,
  ): Promise<OptimizedFeeResult> {
    const baseFee = 5000;

    // Adaptive logic based on recent success rate
    let adaptiveMultiplier = 1.0;
    if (networkConditions.recentTransactionSuccessRate < 0.8) {
      adaptiveMultiplier = 2.0; // Increase fees if success rate is low
    } else if (networkConditions.recentTransactionSuccessRate > 0.95) {
      adaptiveMultiplier = 0.7; // Decrease fees if success rate is high
    }

    const congestionMultiplier =
      networkConditions.congestion === "high"
        ? 2.0
        : networkConditions.congestion === "medium"
          ? 1.5
          : 1.0;

    const priorityFee = Math.floor(
      networkConditions.priorityFeePercentile *
        adaptiveMultiplier *
        congestionMultiplier,
    );
    const totalFee = baseFee + priorityFee;

    const estimatedSuccessRate = networkConditions.recentTransactionSuccessRate;
    const estimatedConfirmationTime =
      networkConditions.congestion === "high"
        ? 25
        : networkConditions.congestion === "medium"
          ? 40
          : 80;

    return {
      recommendedFee: {
        baseFee,
        priorityFee,
        totalFee,
        computeUnits: 5000,
        feePayer: transaction.feePayer?.toString() || "",
      },
      strategy: this.name,
      confidence: 0.75,
      estimatedSuccessRate,
      estimatedConfirmationTime,
      alternativeOptions: [],
      reasoning: [
        "Adapts fees based on recent transaction success rates",
        "Increases fees when success rates are low",
        "Decreases fees when network conditions are favorable",
      ],
    };
  }
}
