import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js';
import { DexPool, DexType } from './dex-pool.entity';
import { DexSwap, SwapDirection } from './dex-swap.entity';
import { DexLiquidityPosition, PositionType } from './dex-liquidity-position.entity';
import { CpiService } from './cpi.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class DexService {
  private readonly logger = new Logger(DexService.name);

  // Known DEX program IDs
  private readonly RAYDIUM_AMM_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
  private readonly ORCA_WHIRLPOOL_PROGRAM_ID = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';

  constructor(
    @InjectRepository(DexPool)
    private readonly dexPoolRepository: Repository<DexPool>,
    @InjectRepository(DexSwap)
    private readonly dexSwapRepository: Repository<DexSwap>,
    @InjectRepository(DexLiquidityPosition)
    private readonly dexLiquidityPositionRepository: Repository<DexLiquidityPosition>,
    private readonly cpiService: CpiService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create or update a DEX pool
   */
  async createOrUpdatePool(
    poolAddress: string,
    dexType: DexType,
    dexProgramId: string,
    tokenAMint: string,
    tokenBMint: string,
    tokenABalance: number,
    tokenBBalance: number,
    feeRate?: number,
    metadata?: any,
  ): Promise<DexPool> {
    let pool = await this.dexPoolRepository.findOne({
      where: { poolAddress },
    });

    if (pool) {
      // Update existing pool
      pool.tokenABalance = tokenABalance;
      pool.tokenBBalance = tokenBBalance;
      if (feeRate !== undefined) pool.feeRate = feeRate;
      pool.updatedAt = new Date();
    } else {
      // Create new pool
      pool = this.dexPoolRepository.create({
        poolAddress,
        dexType,
        dexProgramId,
        tokenAMint,
        tokenBMint,
        tokenABalance,
        tokenBBalance,
        feeRate,
        metadata,
        isActive: true,
      });
    }

    return await this.dexPoolRepository.save(pool);
  }

  /**
   * Get pool by address
   */
  async getPool(poolAddress: string): Promise<DexPool> {
    const pool = await this.dexPoolRepository.findOne({
      where: { poolAddress },
      relations: ['swaps', 'liquidityPositions'],
    });

    if (!pool) {
      throw new BadRequestException('Pool not found');
    }

    return pool;
  }

  /**
   * Get pools by token pair
   */
  async getPoolsByTokens(tokenAMint: string, tokenBMint: string): Promise<DexPool[]> {
    return await this.dexPoolRepository.find({
      where: [
        { tokenAMint, tokenBMint },
        { tokenAMint: tokenBMint, tokenBMint: tokenAMint },
      ],
    });
  }

  /**
   * Calculate swap amount using AMM formula
   */
  calculateSwapAmount(
    pool: DexPool,
    amountIn: number,
    direction: SwapDirection,
    slippageTolerance: number = 0.5, // 0.5%
  ): {
    amountOut: number;
    feeAmount: number;
    priceImpact: number;
    minimumAmountOut: number;
  } {
    const feeRate = pool.feeRate || 0.003; // Default 0.3% fee
    const feeAmount = amountIn * feeRate;
    const amountInAfterFee = amountIn - feeAmount;

    let reserveIn: number, reserveOut: number;

    if (direction === SwapDirection.A_TO_B) {
      reserveIn = pool.tokenABalance;
      reserveOut = pool.tokenBBalance;
    } else {
      reserveIn = pool.tokenBBalance;
      reserveOut = pool.tokenABalance;
    }

    // AMM formula: (x + dx) * (y - dy) = x * y
    // dy = (y * dx) / (x + dx)
    const amountOut = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);

    // Price impact = (actual price - spot price) / spot price
    const spotPrice = reserveOut / reserveIn;
    const actualPrice = amountOut / amountInAfterFee;
    const priceImpact = ((actualPrice - spotPrice) / spotPrice) * 100;

    // Apply slippage tolerance
    const minimumAmountOut = amountOut * (1 - slippageTolerance / 100);

    return {
      amountOut,
      feeAmount,
      priceImpact,
      minimumAmountOut,
    };
  }

  /**
   * Perform a DEX swap
   */
  async performSwap(
    userPrivateKey: string,
    poolAddress: string,
    amountIn: number,
    direction: SwapDirection,
    slippageTolerance: number = 0.5,
  ): Promise<DexSwap> {
    const pool = await this.getPool(poolAddress);

    // Calculate swap parameters
    const swapParams = this.calculateSwapAmount(pool, amountIn, direction, slippageTolerance);

    this.logger.log(
      `Performing DEX swap: ${amountIn} -> ${swapParams.amountOut} with ${swapParams.priceImpact}% price impact`,
    );

    // Create swap record
    const userKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(userPrivateKey)));

    const swap = this.dexSwapRepository.create({
      transactionSignature: `pending-${Date.now()}`,
      poolId: pool.id,
      userAddress: userKeypair.publicKey.toString(),
      direction,
      amountIn,
      amountOut: swapParams.amountOut,
      feeAmount: swapParams.feeAmount,
      priceImpact: swapParams.priceImpact,
      slippage: slippageTolerance,
      minimumAmountOut: swapParams.minimumAmountOut,
      status: 'pending',
    });

    const savedSwap = await this.dexSwapRepository.save(swap);

    try {
      // Build swap instruction based on DEX type
      const swapInstruction = await this.buildSwapInstruction(
        pool,
        userKeypair.publicKey.toString(),
        amountIn,
        direction,
        swapParams.minimumAmountOut,
      );

      // Execute transaction
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        pool.dexProgramId,
        swapInstruction.data,
        swapInstruction.accounts,
        200000,
      );

      // Update swap with signature
      savedSwap.transactionSignature = signature;
      savedSwap.status = 'confirmed';

      // Update pool balances (simplified - in reality would fetch from blockchain)
      if (direction === SwapDirection.A_TO_B) {
        pool.tokenABalance += amountIn;
        pool.tokenBBalance -= swapParams.amountOut;
      } else {
        pool.tokenBBalance += amountIn;
        pool.tokenABalance -= swapParams.amountOut;
      }
      await this.dexPoolRepository.save(pool);

      return await this.dexSwapRepository.save(savedSwap);
    } catch (error) {
      savedSwap.status = 'failed';
      await this.dexSwapRepository.save(savedSwap);
      throw error;
    }
  }

  /**
   * Build swap instruction for different DEX types
   */
  private async buildSwapInstruction(
    pool: DexPool,
    userAddress: string,
    amountIn: number,
    direction: SwapDirection,
    minimumAmountOut: number,
  ): Promise<{ data: string; accounts: any[] }> {
    // This is a simplified implementation
    // In a real implementation, you would use the specific DEX SDKs

    const accounts = [
      {
        pubkey: userAddress,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: pool.poolAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: direction === SwapDirection.A_TO_B ? pool.tokenAMint : pool.tokenBMint,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: direction === SwapDirection.A_TO_B ? pool.tokenBMint : pool.tokenAMint,
        isSigner: false,
        isWritable: false,
      },
    ];

    // Simplified instruction data
    const instructionData = {
      instruction: 'swap',
      amountIn,
      minimumAmountOut,
      direction,
    };

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString('base64'),
      accounts,
    };
  }

  /**
   * Add liquidity to a pool
   */
  async addLiquidity(
    userPrivateKey: string,
    poolAddress: string,
    tokenAAmount: number,
    tokenBAmount: number,
    positionType: PositionType = PositionType.STANDARD,
  ): Promise<DexLiquidityPosition> {
    const pool = await this.getPool(poolAddress);

    const userKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(userPrivateKey)));

    // Calculate liquidity shares (simplified)
    const totalLiquidity = pool.tokenABalance + pool.tokenBBalance;
    const liquidityShares = ((tokenAAmount + tokenBAmount) / totalLiquidity) * 100; // Percentage

    const position = this.dexLiquidityPositionRepository.create({
      poolId: pool.id,
      ownerAddress: userKeypair.publicKey.toString(),
      positionType,
      tokenAAmount,
      tokenBAmount,
      liquidityShares,
      isActive: true,
    });

    const savedPosition = await this.dexLiquidityPositionRepository.save(position);

    // Update pool balances
    pool.tokenABalance += tokenAAmount;
    pool.tokenBBalance += tokenBAmount;
    await this.dexPoolRepository.save(pool);

    return savedPosition;
  }

  /**
   * Remove liquidity from a pool
   */
  async removeLiquidity(
    userPrivateKey: string,
    positionId: string,
    percentage: number = 100, // Percentage to remove
  ): Promise<DexLiquidityPosition> {
    const position = await this.dexLiquidityPositionRepository.findOne({
      where: { id: positionId },
      relations: ['pool'],
    });

    if (!position) {
      throw new BadRequestException('Position not found');
    }

    const userKeypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(userPrivateKey)));

    if (position.ownerAddress !== userKeypair.publicKey.toString()) {
      throw new BadRequestException('Unauthorized');
    }

    // Calculate amounts to remove
    const tokenAAmount = (position.tokenAAmount * percentage) / 100;
    const tokenBAmount = (position.tokenBAmount * percentage) / 100;

    // Update position
    position.tokenAAmount -= tokenAAmount;
    position.tokenBAmount -= tokenBAmount;
    position.liquidityShares -= (position.liquidityShares * percentage) / 100;

    if (position.liquidityShares <= 0) {
      position.isActive = false;
    }

    // Update pool balances
    position.pool.tokenABalance -= tokenAAmount;
    position.pool.tokenBBalance -= tokenBAmount;
    await this.dexPoolRepository.save(position.pool);

    return await this.dexLiquidityPositionRepository.save(position);
  }

  /**
   * Get user's liquidity positions
   */
  async getUserPositions(userAddress: string): Promise<DexLiquidityPosition[]> {
    return await this.dexLiquidityPositionRepository.find({
      where: { ownerAddress: userAddress, isActive: true },
      relations: ['pool'],
    });
  }

  /**
   * Get swap history for a user
   */
  async getUserSwapHistory(userAddress: string): Promise<DexSwap[]> {
    return await this.dexSwapRepository.find({
      where: { userAddress },
      relations: ['pool'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: string): Promise<any> {
    const pool = await this.getPool(poolAddress);

    const recentSwaps = await this.dexSwapRepository.find({
      where: { poolId: pool.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const volume24h = recentSwaps
      .filter((swap) => {
        const swapTime = swap.createdAt.getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return swapTime > dayAgo;
      })
      .reduce((sum, swap) => sum + swap.amountIn, 0);

    return {
      poolAddress: pool.poolAddress,
      tokenAPrice: pool.tokenBBalance / pool.tokenABalance,
      tokenBPrice: pool.tokenABalance / pool.tokenBBalance,
      liquidity: pool.tokenABalance + pool.tokenBBalance,
      volume24h: volume24h,
      feeRate: pool.feeRate,
      swapCount: recentSwaps.length,
    };
  }
}
