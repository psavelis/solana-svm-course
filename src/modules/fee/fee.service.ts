import { Injectable } from '@nestjs/common';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

export interface FeeEstimate {
  baseFee: number; // lamports per signature
  priorityFee: number; // additional priority fee in lamports
  totalFee: number; // total estimated fee
  computeUnits: number; // estimated compute units
  feePayer: string; // public key of fee payer
}

export interface FeeRecommendation {
  conservative: FeeEstimate;
  moderate: FeeEstimate;
  aggressive: FeeEstimate;
  networkCongestion: 'low' | 'medium' | 'high';
  recentBlockhash: string;
}

export interface PriorityFeeOptions {
  priorityLevel: 'min' | 'low' | 'medium' | 'high' | 'veryHigh' | 'unsafeMax';
  includeVotes?: boolean; // Include vote transactions in calculation
}

@Injectable()
/**
 * Service for managing fee mechanisms and optimization.
 * @see docs/diagrams/05-fee-mechanism.md
 */
export class FeeService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
  }

  /**
   * Get basic fee estimate for a transaction
   */
  async getFeeEstimate(transaction?: Transaction): Promise<FeeEstimate> {
    try {
      const { feeCalculator } = await this.connection.getRecentBlockhash();
      const baseFee = feeCalculator.lamportsPerSignature;

      // Estimate compute units based on transaction type
      const computeUnits = this.estimateComputeUnits(transaction);

      // Basic priority fee calculation (can be enhanced)
      const priorityFee = await this.calculatePriorityFee(computeUnits);

      return {
        baseFee,
        priorityFee,
        totalFee: baseFee + priorityFee,
        computeUnits,
        feePayer: transaction?.feePayer?.toString() || '',
      };
    } catch (error) {
      throw new Error(`Failed to get fee estimate: ${error.message}`);
    }
  }

  /**
   * Get in-depth fee recommendations with multiple options
   */
  async getFeeRecommendations(
    transaction?: Transaction,
    options: PriorityFeeOptions = { priorityLevel: 'medium' },
  ): Promise<FeeRecommendation> {
    try {
      const { blockhash, feeCalculator } = await this.connection.getRecentBlockhash();
      const baseFee = feeCalculator.lamportsPerSignature;
      const computeUnits = this.estimateComputeUnits(transaction);

      // Get network congestion level
      const networkCongestion = await this.getNetworkCongestion();

      // Calculate priority fees for different levels
      const priorityFees = await this.calculatePriorityFeeLevels(computeUnits, options);

      const createEstimate = (priorityFee: number): FeeEstimate => ({
        baseFee,
        priorityFee,
        totalFee: baseFee + priorityFee,
        computeUnits,
        feePayer: transaction?.feePayer?.toString() || '',
      });

      return {
        conservative: createEstimate(priorityFees.conservative),
        moderate: createEstimate(priorityFees.moderate),
        aggressive: createEstimate(priorityFees.aggressive),
        networkCongestion,
        recentBlockhash: blockhash,
      };
    } catch (error) {
      throw new Error(`Failed to get fee recommendations: ${error.message}`);
    }
  }

  /**
   * Estimate compute units for different transaction types
   */
  private estimateComputeUnits(transaction?: Transaction): number {
    if (!transaction) {
      // Default estimate for simple transfer
      return 5000;
    }

    // Analyze transaction instructions to estimate compute units
    let totalComputeUnits = 0;

    for (const instruction of transaction.instructions) {
      // System program instructions
      if (instruction.programId.equals(SystemProgram.programId)) {
        // Transfer instruction
        if (instruction.data.length >= 4 && instruction.data[0] === 2) {
          totalComputeUnits += 5000; // SOL transfer
        }
        // Create account
        else if (instruction.data.length >= 4 && instruction.data[0] === 0) {
          totalComputeUnits += 10000; // Account creation
        }
      }
      // Token program instructions (basic estimate)
      else if (instruction.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
        totalComputeUnits += 8000; // Token operations
      }
      // Other programs - conservative estimate
      else {
        totalComputeUnits += 10000;
      }
    }

    // Add buffer for transaction overhead
    return Math.max(totalComputeUnits, 5000);
  }

  /**
   * Calculate basic priority fee
   */
  private async calculatePriorityFee(computeUnits: number): Promise<number> {
    try {
      // Get recent priority fees from the network
      const recentFees = await this.getRecentPriorityFees();

      if (recentFees.length === 0) {
        // Fallback to basic calculation
        return Math.floor(computeUnits * 0.000001); // 0.000001 lamports per compute unit
      }

      // Use median of recent fees
      const sortedFees = recentFees.sort((a, b) => a - b);
      const medianFee = sortedFees[Math.floor(sortedFees.length / 2)];

      return Math.floor(medianFee * computeUnits);
    } catch (error) {
      // Fallback calculation
      return Math.floor(computeUnits * 0.000001);
    }
  }

  /**
   * Calculate priority fees for different levels
   */
  private async calculatePriorityFeeLevels(
    computeUnits: number,
    options: PriorityFeeOptions,
  ): Promise<{ conservative: number; moderate: number; aggressive: number }> {
    const basePriorityFee = await this.calculatePriorityFee(computeUnits);

    // Multipliers based on priority level
    const multipliers = {
      min: 0.1,
      low: 0.5,
      medium: 1.0,
      high: 2.0,
      veryHigh: 5.0,
      unsafeMax: 10.0,
    };

    const multiplier = multipliers[options.priorityLevel] || 1.0;

    return {
      conservative: Math.floor(basePriorityFee * multiplier * 0.5),
      moderate: Math.floor(basePriorityFee * multiplier),
      aggressive: Math.floor(basePriorityFee * multiplier * 2.0),
    };
  }

  /**
   * Get recent priority fees from the network
   */
  private async getRecentPriorityFees(): Promise<number[]> {
    try {
      // Get recent blocks to analyze fee patterns
      const recentBlockhash = await this.connection.getRecentBlockhash();
      const slot = await this.connection.getSlot();

      // Get recent confirmed blocks (simplified approach)
      const recentSlots = [];
      for (let i = 0; i < 5; i++) {
        recentSlots.push(slot - i);
      }

      const fees: number[] = [];

      for (const blockSlot of recentSlots) {
        try {
          const block = await this.connection.getConfirmedBlock(blockSlot);
          if (block && block.transactions) {
            for (const tx of block.transactions) {
              if (tx.meta && tx.meta.fee) {
                // Calculate fee per compute unit (rough estimate)
                const computeUnits = tx.meta.computeUnitsConsumed || 5000;
                const feePerComputeUnit = tx.meta.fee / computeUnits;
                fees.push(feePerComputeUnit);
              }
            }
          }
        } catch (error) {
          // Skip blocks that can't be retrieved
          continue;
        }
      }

      return fees;
    } catch (error) {
      return [];
    }
  }

  /**
   * Estimate network congestion level
   */
  private async getNetworkCongestion(): Promise<'low' | 'medium' | 'high'> {
    try {
      // Get recent performance samples
      const performanceSamples = await this.connection.getRecentPerformanceSamples(5);

      if (performanceSamples.length === 0) {
        return 'low';
      }

      // Calculate average slot utilization
      const avgUtilization =
        performanceSamples.reduce((sum, sample) => {
          return sum + sample.numTransactions / sample.samplePeriodSecs;
        }, 0) / performanceSamples.length;

      // Thresholds for congestion levels
      if (avgUtilization > 5000) return 'high'; // Very busy
      if (avgUtilization > 2000) return 'medium'; // Moderately busy
      return 'low'; // Normal activity
    } catch (error) {
      return 'medium'; // Default to medium on error
    }
  }

  /**
   * Validate if a fee estimate is reasonable
   */
  validateFeeEstimate(estimate: FeeEstimate): boolean {
    // Basic validation rules
    if (estimate.baseFee < 0 || estimate.priorityFee < 0 || estimate.totalFee < 0) {
      return false;
    }

    if (estimate.computeUnits < 0 || estimate.computeUnits > 1400000) {
      // Max compute units per transaction
      return false;
    }

    // Total fee should not exceed reasonable limits (e.g., 1 SOL = 1e9 lamports)
    if (estimate.totalFee > 100000000) {
      // 0.1 SOL max
      return false;
    }

    return true;
  }

  /**
   * Get fee market statistics
   */
  async getFeeMarketStats(): Promise<{
    averageFee: number;
    medianFee: number;
    percentile95: number;
    networkLoad: number;
    recommendedBaseFee: number;
  }> {
    try {
      const recentFees = await this.getRecentPriorityFees();

      if (recentFees.length === 0) {
        return {
          averageFee: 0.000001,
          medianFee: 0.000001,
          percentile95: 0.000002,
          networkLoad: 0.5,
          recommendedBaseFee: 5000,
        };
      }

      const sortedFees = recentFees.sort((a, b) => a - b);
      const averageFee = recentFees.reduce((sum, fee) => sum + fee, 0) / recentFees.length;
      const medianFee = sortedFees[Math.floor(sortedFees.length / 2)];
      const percentile95 =
        sortedFees[Math.floor(sortedFees.length * 0.95)] || sortedFees[sortedFees.length - 1];

      const networkLoad = await this.getNetworkLoad();

      return {
        averageFee,
        medianFee,
        percentile95,
        networkLoad,
        recommendedBaseFee: 5000, // Base fee per signature
      };
    } catch (error) {
      throw new Error(`Failed to get fee market stats: ${error.message}`);
    }
  }

  /**
   * Get network load as a percentage (0-1)
   */
  private async getNetworkLoad(): Promise<number> {
    try {
      const congestion = await this.getNetworkCongestion();
      switch (congestion) {
        case 'low':
          return 0.3;
        case 'medium':
          return 0.6;
        case 'high':
          return 0.9;
        default:
          return 0.5;
      }
    } catch (error) {
      return 0.5;
    }
  }
}
