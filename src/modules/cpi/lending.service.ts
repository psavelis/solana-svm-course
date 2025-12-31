import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LendingPool, LendingPoolType } from "./lending-pool.entity";
import { LendingPosition, PositionType, PositionStatus } from "./lending-position.entity";
import { TransactionsService } from "../transactions/transactions.service";

@Injectable()
export class LendingService {
  private readonly logger = new Logger(LendingService.name);

  // Known lending program IDs
  private readonly SOLEND_PROGRAM_ID = "So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo";
  private readonly PORT_FINANCE_PROGRAM_ID = "Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR";

  constructor(
    @InjectRepository(LendingPool)
    private readonly lendingPoolRepository: Repository<LendingPool>,
    @InjectRepository(LendingPosition)
    private readonly lendingPositionRepository: Repository<LendingPosition>,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create or update a lending pool
   */
  async createOrUpdatePool(
    poolAddress: string,
    poolType: LendingPoolType,
    lendingProgramId: string,
    ownerAddress: string,
    reserves: any[],
    metadata?: any,
  ): Promise<LendingPool> {
    let pool = await this.lendingPoolRepository.findOne({
      where: { poolAddress },
    });

    if (pool) {
      // Update existing pool
      pool.reserves = reserves;
      pool.updatedAt = new Date();
    } else {
      // Create new pool
      pool = this.lendingPoolRepository.create({
        poolAddress,
        poolType,
        lendingProgramId,
        ownerAddress,
        reserves,
        metadata,
        isActive: true,
      });
    }

    return await this.lendingPoolRepository.save(pool);
  }

  /**
   * Get pool by address
   */
  async getPool(poolAddress: string): Promise<LendingPool> {
    const pool = await this.lendingPoolRepository.findOne({
      where: { poolAddress },
      relations: ["positions"],
    });

    if (!pool) {
      throw new BadRequestException("Lending pool not found");
    }

    return pool;
  }

  /**
   * Get pools by lending program
   */
  async getPoolsByProgram(lendingProgramId: string): Promise<LendingPool[]> {
    return await this.lendingPoolRepository.find({
      where: { lendingProgramId },
    });
  }

  /**
   * Supply assets to a lending pool
   */
  async supplyToPool(
    userPrivateKey: string,
    poolAddress: string,
    assetMint: string,
    amount: number,
  ): Promise<LendingPosition> {
    const pool = await this.getPool(poolAddress);

    // Find the reserve for the asset
    const reserve = pool.reserves.find(r => r.assetMint === assetMint);
    if (!reserve) {
      throw new BadRequestException("Asset not supported in this pool");
    }

    // Create supply position
    const position = this.lendingPositionRepository.create({
      poolId: pool.id,
      userAddress: "", // Will be set after keypair creation
      positionType: PositionType.SUPPLY,
      assetMint,
      amount,
      status: PositionStatus.ACTIVE,
    });

    const savedPosition = await this.lendingPositionRepository.save(position);

    try {
      // Build supply instruction
      const supplyInstruction = await this.buildSupplyInstruction(
        pool,
        assetMint,
        amount,
      );

      // Execute transaction
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        pool.lendingProgramId,
        supplyInstruction.data,
        supplyInstruction.accounts,
        200000,
      );

      // Update position with user address and transaction info
      const userKeypair = await this.getKeypairFromPrivateKey(userPrivateKey);
      savedPosition.userAddress = userKeypair.publicKey.toString();

      // Update pool reserve
      reserve.liquiditySupply += amount;

      await this.lendingPoolRepository.save(pool);

      return await this.lendingPositionRepository.save(savedPosition);
    } catch (error) {
      savedPosition.status = PositionStatus.CLOSED;
      await this.lendingPositionRepository.save(savedPosition);
      throw error;
    }
  }

  /**
   * Borrow assets from a lending pool
   */
  async borrowFromPool(
    userPrivateKey: string,
    poolAddress: string,
    assetMint: string,
    amount: number,
    collateralMint: string,
    collateralAmount: number,
  ): Promise<LendingPosition> {
    const pool = await this.getPool(poolAddress);

    // Find the reserve for the asset
    const reserve = pool.reserves.find(r => r.assetMint === assetMint);
    if (!reserve) {
      throw new BadRequestException("Asset not supported in this pool");
    }

    // Check if borrowing is allowed (simplified health factor check)
    const healthFactor = await this.calculateHealthFactor(
      userPrivateKey,
      poolAddress,
      assetMint,
      amount,
      collateralMint,
      collateralAmount,
    );

    if (healthFactor < 1.2) { // Minimum health factor
      throw new BadRequestException("Insufficient collateral for borrow");
    }

    // Create borrow position
    const position = this.lendingPositionRepository.create({
      poolId: pool.id,
      userAddress: "", // Will be set after keypair creation
      positionType: PositionType.BORROW,
      assetMint,
      amount,
      healthFactor,
      status: PositionStatus.ACTIVE,
      collateralInfo: [{
        collateralMint,
        collateralAmount,
        collateralValue: collateralAmount, // Simplified
      }],
    });

    const savedPosition = await this.lendingPositionRepository.save(position);

    try {
      // Build borrow instruction
      const borrowInstruction = await this.buildBorrowInstruction(
        pool,
        assetMint,
        amount,
        collateralMint,
        collateralAmount,
      );

      // Execute transaction
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        pool.lendingProgramId,
        borrowInstruction.data,
        borrowInstruction.accounts,
        200000,
      );

      // Update position with user address
      const userKeypair = await this.getKeypairFromPrivateKey(userPrivateKey);
      savedPosition.userAddress = userKeypair.publicKey.toString();

      // Update pool reserve
      reserve.liquidityBorrowed += amount;

      await this.lendingPoolRepository.save(pool);

      return await this.lendingPositionRepository.save(savedPosition);
    } catch (error) {
      savedPosition.status = PositionStatus.CLOSED;
      await this.lendingPositionRepository.save(savedPosition);
      throw error;
    }
  }

  /**
   * Repay borrowed assets
   */
  async repayBorrow(
    userPrivateKey: string,
    positionId: string,
    repayAmount: number,
  ): Promise<LendingPosition> {
    const position = await this.lendingPositionRepository.findOne({
      where: { id: positionId },
      relations: ["pool"],
    });

    if (!position) {
      throw new BadRequestException("Position not found");
    }

    if (position.positionType !== PositionType.BORROW) {
      throw new BadRequestException("Position is not a borrow position");
    }

    const userKeypair = await this.getKeypairFromPrivateKey(userPrivateKey);
    if (position.userAddress !== userKeypair.publicKey.toString()) {
      throw new BadRequestException("Unauthorized");
    }

    try {
      // Build repay instruction
      const repayInstruction = await this.buildRepayInstruction(
        position.pool,
        position.assetMint,
        repayAmount,
      );

      // Execute transaction
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        position.pool.lendingProgramId,
        repayInstruction.data,
        repayInstruction.accounts,
        200000,
      );

      // Update position
      position.amount -= repayAmount;
      if (position.amount <= 0) {
        position.status = PositionStatus.CLOSED;
      }

      // Update pool reserve
      const reserve = position.pool.reserves.find(r => r.assetMint === position.assetMint);
      if (reserve) {
        reserve.liquidityBorrowed -= repayAmount;
        await this.lendingPoolRepository.save(position.pool);
      }

      return await this.lendingPositionRepository.save(position);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Withdraw supplied assets
   */
  async withdrawSupply(
    userPrivateKey: string,
    positionId: string,
    withdrawAmount: number,
  ): Promise<LendingPosition> {
    const position = await this.lendingPositionRepository.findOne({
      where: { id: positionId },
      relations: ["pool"],
    });

    if (!position) {
      throw new BadRequestException("Position not found");
    }

    if (position.positionType !== PositionType.SUPPLY) {
      throw new BadRequestException("Position is not a supply position");
    }

    const userKeypair = await this.getKeypairFromPrivateKey(userPrivateKey);
    if (position.userAddress !== userKeypair.publicKey.toString()) {
      throw new BadRequestException("Unauthorized");
    }

    try {
      // Build withdraw instruction
      const withdrawInstruction = await this.buildWithdrawInstruction(
        position.pool,
        position.assetMint,
        withdrawAmount,
      );

      // Execute transaction
      const signature = await this.transactionsService.sendProgramInvocation(
        userPrivateKey,
        position.pool.lendingProgramId,
        withdrawInstruction.data,
        withdrawInstruction.accounts,
        200000,
      );

      // Update position
      position.amount -= withdrawAmount;
      if (position.amount <= 0) {
        position.status = PositionStatus.CLOSED;
      }

      // Update pool reserve
      const reserve = position.pool.reserves.find(r => r.assetMint === position.assetMint);
      if (reserve) {
        reserve.liquiditySupply -= withdrawAmount;
        await this.lendingPoolRepository.save(position.pool);
      }

      return await this.lendingPositionRepository.save(position);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate health factor for a borrow position
   */
  private async calculateHealthFactor(
    userPrivateKey: string,
    poolAddress: string,
    borrowMint: string,
    borrowAmount: number,
    collateralMint: string,
    collateralAmount: number,
  ): Promise<number> {
    // Simplified health factor calculation
    // In a real implementation, this would fetch current prices from oracles

    // Assume collateral value = collateral amount (simplified)
    const collateralValue = collateralAmount;

    // Assume borrow value = borrow amount (simplified)
    const borrowValue = borrowAmount;

    // Get LTV ratio from pool
    const pool = await this.getPool(poolAddress);
    const reserve = pool.reserves.find(r => r.assetMint === borrowMint);
    const ltvRatio = reserve?.ltvRatio || 0.75; // Default 75%

    // Health factor = (collateral value * LTV) / borrow value
    return (collateralValue * ltvRatio) / borrowValue;
  }

  /**
   * Build supply instruction
   */
  private async buildSupplyInstruction(
    pool: LendingPool,
    assetMint: string,
    amount: number,
  ): Promise<{ data: string; accounts: any[] }> {
    // Simplified instruction data
    const instructionData = {
      instruction: "supply",
      assetMint,
      amount,
    };

    const accounts = [
      {
        pubkey: pool.ownerAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: assetMint,
        isSigner: false,
        isWritable: false,
      },
    ];

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build borrow instruction
   */
  private async buildBorrowInstruction(
    pool: LendingPool,
    assetMint: string,
    amount: number,
    collateralMint: string,
    collateralAmount: number,
  ): Promise<{ data: string; accounts: any[] }> {
    // Simplified instruction data
    const instructionData = {
      instruction: "borrow",
      assetMint,
      amount,
      collateralMint,
      collateralAmount,
    };

    const accounts = [
      {
        pubkey: pool.ownerAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: assetMint,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: collateralMint,
        isSigner: false,
        isWritable: false,
      },
    ];

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build repay instruction
   */
  private async buildRepayInstruction(
    pool: LendingPool,
    assetMint: string,
    amount: number,
  ): Promise<{ data: string; accounts: any[] }> {
    // Simplified instruction data
    const instructionData = {
      instruction: "repay",
      assetMint,
      amount,
    };

    const accounts = [
      {
        pubkey: pool.ownerAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: assetMint,
        isSigner: false,
        isWritable: false,
      },
    ];

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Build withdraw instruction
   */
  private async buildWithdrawInstruction(
    pool: LendingPool,
    assetMint: string,
    amount: number,
  ): Promise<{ data: string; accounts: any[] }> {
    // Simplified instruction data
    const instructionData = {
      instruction: "withdraw",
      assetMint,
      amount,
    };

    const accounts = [
      {
        pubkey: pool.ownerAddress,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: assetMint,
        isSigner: false,
        isWritable: false,
      },
    ];

    return {
      data: Buffer.from(JSON.stringify(instructionData)).toString("base64"),
      accounts,
    };
  }

  /**
   * Get user's lending positions
   */
  async getUserPositions(userAddress: string): Promise<LendingPosition[]> {
    return await this.lendingPositionRepository.find({
      where: { userAddress, status: PositionStatus.ACTIVE },
      relations: ["pool"],
    });
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolAddress: string): Promise<any> {
    const pool = await this.getPool(poolAddress);

    const positions = await this.lendingPositionRepository.find({
      where: { poolId: pool.id },
    });

    const supplyPositions = positions.filter(p => p.positionType === PositionType.SUPPLY);
    const borrowPositions = positions.filter(p => p.positionType === PositionType.BORROW);

    const totalSupplied = supplyPositions.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalBorrowed = borrowPositions.reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      poolAddress: pool.poolAddress,
      totalSupplied,
      totalBorrowed,
      utilizationRate: totalSupplied > 0 ? totalBorrowed / totalSupplied : 0,
      reserves: pool.reserves,
      activePositions: positions.length,
    };
  }

  /**
   * Get keypair from private key (helper method)
   */
  private async getKeypairFromPrivateKey(privateKey: string) {
    const { Keypair } = await import("@solana/web3.js");
    return Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)));
  }
}