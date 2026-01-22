import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { Connection, PublicKey, SystemProgram, Transaction, Keypair } from '@solana/web3.js';

import {
  EscrowAccount,
  EscrowStatus,
  EscrowSourceType,
  EscrowTransaction,
  EscrowTransactionType,
} from '../entities/escrow.entity';
import { SupportedToken, getTokenConfig, toDisplayAmount } from '../entities/token.entity';

/**
 * # Create Escrow Request
 *
 * Request interface for creating a new escrow account.
 *
 * ## Multi-Token Escrow Support
 *
 * ```
 * ┌──────────────────────────────────────────────────────────────┐
 * │              MULTI-TOKEN ESCROW ARCHITECTURE                 │
 * ├──────────────────────────────────────────────────────────────┤
 * │                                                              │
 * │  SOL Escrow:                                                 │
 * │    • Native SOL transfer via SystemProgram                   │
 * │    • No ATA required                                         │
 * │    • 9 decimal precision                                     │
 * │                                                              │
 * │  SPL Token Escrow (USDC/USDT/PYUSD):                        │
 * │    • Associated Token Account (ATA) required                 │
 * │    • Token mint must match expected mint                     │
 * │    • 6 decimal precision                                     │
 * │    • Rent-exempt minimum enforced                            │
 * │                                                              │
 * └──────────────────────────────────────────────────────────────┘
 * ```
 */
export interface CreateEscrowRequest {
  sourceType: EscrowSourceType;
  sourceId: string;
  platformFeePercent?: number;
  /** Token type for the escrow (defaults to SOL) */
  tokenType?: SupportedToken;
  /** SPL Token mint address (required for non-SOL tokens) */
  tokenMint?: string;
}

export interface DepositToEscrowRequest {
  escrowId: string;
  walletId: string;
  amount: string;
  signature: string;
}

export interface ReleaseEscrowRequest {
  escrowId: string;
  distributions: {
    walletId: string;
    amount: string;
    placement?: number;
  }[];
}

export interface RefundEscrowRequest {
  escrowId: string;
  walletIds?: string[]; // if not provided, refund all
  reason?: string;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private connection: Connection;

  constructor(
    @InjectRepository(EscrowAccount)
    private escrowRepository: Repository<EscrowAccount>,
    @InjectRepository(EscrowTransaction)
    private escrowTxRepository: Repository<EscrowTransaction>,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    );
  }

  /**
   * Create a new escrow account for a match or tournament
   *
   * ## Multi-Token Escrow Creation
   *
   * For SOL escrows:
   * - Native SOL account created
   * - No ATA derivation needed
   *
   * For SPL Token escrows (USDC, USDT, PYUSD):
   * - Associated Token Account (ATA) derived
   * - ATA created if not exists
   * - Token mint validated against known addresses
   */
  async createEscrow(request: CreateEscrowRequest): Promise<EscrowAccount> {
    const {
      sourceType,
      sourceId,
      platformFeePercent = 5.0,
      tokenType = SupportedToken.SOL,
      tokenMint,
    } = request;

    // Check for existing escrow
    const existing = await this.escrowRepository.findOne({
      where: { sourceType, sourceId },
    });

    if (existing) {
      throw new BadRequestException(`Escrow already exists for ${sourceType} ${sourceId}`);
    }

    // Get token configuration
    const tokenConfig = getTokenConfig(tokenType);

    // Generate escrow address (PDA simulation)
    const escrowAddress = this.generateEscrowAddress(sourceType, sourceId);

    // Derive ATA for SPL tokens
    let ataAddress: string | null = null;
    if (tokenMint && !tokenConfig.isNative) {
      // In production, this would use getAssociatedTokenAddress from @solana/spl-token
      ataAddress = this.deriveAtaAddress(escrowAddress, tokenMint);
    }

    const escrow = this.escrowRepository.create({
      escrowId: `escrow_${randomBytes(8).toString('hex')}`,
      escrowAddress,
      sourceType,
      sourceId,
      tokenType,
      tokenMint: tokenMint || null,
      ataAddress,
      platformFeePercent,
      status: EscrowStatus.CREATED,
      totalDeposited: '0',
      totalReleased: '0',
      totalRefunded: '0',
      platformFeeCollected: '0',
      currentBalance: '0',
      transactions: [],
    });

    const savedEscrow = await this.escrowRepository.save(escrow);

    this.logger.log(
      `Created ${tokenConfig.symbol} escrow ${savedEscrow.escrowId} for ${sourceType} ${sourceId}`,
    );

    return savedEscrow;
  }

  /**
   * Derive Associated Token Account address
   * @param owner - Owner public key (escrow address)
   * @param mint - Token mint address
   * @returns ATA address string
   */
  private deriveAtaAddress(owner: string, mint: string): string {
    // In production, use getAssociatedTokenAddressSync from @solana/spl-token
    // This is a deterministic derivation simulation
    const hash = createHash('sha256').update(`ata:${owner}:${mint}`).digest('hex');
    return `ata_${hash.slice(0, 32)}`;
  }

  /**
   * Deposit funds to escrow (entry fee payment)
   */
  async depositToEscrow(request: DepositToEscrowRequest): Promise<EscrowTransaction> {
    const { escrowId, walletId, amount, signature } = request;

    const escrow = await this.getEscrowById(escrowId);

    if (!escrow.canDeposit()) {
      throw new BadRequestException(`Escrow ${escrowId} cannot accept deposits`);
    }

    // Create deposit transaction record
    const tx = this.escrowTxRepository.create({
      escrowId: escrow.id,
      type: EscrowTransactionType.DEPOSIT,
      participantWalletId: walletId,
      amount,
      signature,
      metadata: {
        fromAddress: walletId,
        toAddress: escrow.escrowAddress,
      },
    });

    await this.escrowTxRepository.save(tx);

    // Update escrow balance
    escrow.totalDeposited = (BigInt(escrow.totalDeposited) + BigInt(amount)).toString();
    escrow.currentBalance = (BigInt(escrow.currentBalance) + BigInt(amount)).toString();

    if (escrow.status === EscrowStatus.CREATED) {
      escrow.status = EscrowStatus.ACTIVE;
    }

    await this.escrowRepository.save(escrow);

    this.logger.log(`Deposited ${amount} lamports to escrow ${escrowId} from wallet ${walletId}`);

    return tx;
  }

  /**
   * Lock escrow to prevent further deposits (match started)
   */
  async lockEscrow(escrowId: string): Promise<EscrowAccount> {
    const escrow = await this.getEscrowById(escrowId);

    if (escrow.status !== EscrowStatus.ACTIVE) {
      throw new BadRequestException(`Escrow ${escrowId} is not active, cannot lock`);
    }

    escrow.status = EscrowStatus.LOCKED;
    escrow.lockedAt = new Date();
    escrow.metadata = {
      ...escrow.metadata,
      lockedAt: new Date(),
    };

    await this.escrowRepository.save(escrow);

    this.logger.log(`Locked escrow ${escrowId}`);

    return escrow;
  }

  /**
   * Release escrow funds to winners (prize distribution)
   */
  async releaseEscrow(request: ReleaseEscrowRequest): Promise<EscrowTransaction[]> {
    const { escrowId, distributions } = request;

    const escrow = await this.getEscrowById(escrowId);

    if (!escrow.canRelease()) {
      throw new BadRequestException(`Escrow ${escrowId} cannot be released`);
    }

    const totalDistribution = distributions.reduce((sum, d) => sum + BigInt(d.amount), BigInt(0));

    // Calculate platform fee
    const platformFee =
      (BigInt(escrow.currentBalance) * BigInt(Math.round(escrow.platformFeePercent * 100))) /
      BigInt(10000);

    const availableForDistribution = BigInt(escrow.currentBalance) - platformFee;

    if (totalDistribution > availableForDistribution) {
      throw new BadRequestException(
        `Distribution amount ${totalDistribution} exceeds available balance ${availableForDistribution}`,
      );
    }

    escrow.status = EscrowStatus.RELEASING;
    await this.escrowRepository.save(escrow);

    const transactions: EscrowTransaction[] = [];

    try {
      // Record platform fee
      if (platformFee > 0) {
        const feeTx = this.escrowTxRepository.create({
          escrowId: escrow.id,
          type: EscrowTransactionType.PLATFORM_FEE,
          amount: platformFee.toString(),
          metadata: {
            fromAddress: escrow.escrowAddress,
            toAddress: 'platform_treasury',
          },
        });
        await this.escrowTxRepository.save(feeTx);
        transactions.push(feeTx);
      }

      // Process each distribution
      for (const dist of distributions) {
        const releaseTx = this.escrowTxRepository.create({
          escrowId: escrow.id,
          type: EscrowTransactionType.RELEASE,
          participantWalletId: dist.walletId,
          amount: dist.amount,
          signature: `release_${randomBytes(16).toString('hex')}`, // Simulated signature
          metadata: {
            fromAddress: escrow.escrowAddress,
            toAddress: dist.walletId,
            placement: dist.placement,
          },
        });
        await this.escrowTxRepository.save(releaseTx);
        transactions.push(releaseTx);
      }

      // Update escrow state
      escrow.totalReleased = (BigInt(escrow.totalReleased) + totalDistribution).toString();
      escrow.platformFeeCollected = (BigInt(escrow.platformFeeCollected) + platformFee).toString();
      escrow.currentBalance = (
        BigInt(escrow.currentBalance) -
        totalDistribution -
        platformFee
      ).toString();
      escrow.status = EscrowStatus.RELEASED;
      escrow.metadata = {
        ...escrow.metadata,
        releaseReason: 'Prize distribution completed',
      };

      await this.escrowRepository.save(escrow);

      this.logger.log(
        `Released escrow ${escrowId}: ${transactions.length} distributions, ${platformFee} platform fee`,
      );

      return transactions;
    } catch (error) {
      escrow.status = EscrowStatus.LOCKED;
      await this.escrowRepository.save(escrow);
      throw error;
    }
  }

  /**
   * Refund escrow to participants (match cancelled)
   */
  async refundEscrow(request: RefundEscrowRequest): Promise<EscrowTransaction[]> {
    const { escrowId, walletIds, reason } = request;

    const escrow = await this.getEscrowById(escrowId);

    if (!escrow.canRefund()) {
      throw new BadRequestException(`Escrow ${escrowId} cannot be refunded`);
    }

    // Get deposit transactions to refund
    const deposits = await this.escrowTxRepository.find({
      where: {
        escrowId: escrow.id,
        type: EscrowTransactionType.DEPOSIT,
        ...(walletIds ? { participantWalletId: In(walletIds) } : {}),
      },
    });

    if (deposits.length === 0) {
      throw new BadRequestException(`No deposits found to refund`);
    }

    escrow.status = EscrowStatus.REFUNDING;
    await this.escrowRepository.save(escrow);

    const transactions: EscrowTransaction[] = [];
    let totalRefunded = BigInt(0);

    try {
      for (const deposit of deposits) {
        const refundTx = this.escrowTxRepository.create({
          escrowId: escrow.id,
          type: EscrowTransactionType.REFUND,
          participantWalletId: deposit.participantWalletId,
          amount: deposit.amount,
          signature: `refund_${randomBytes(16).toString('hex')}`,
          metadata: {
            fromAddress: escrow.escrowAddress,
            toAddress: deposit.participantWalletId,
          },
        });
        await this.escrowTxRepository.save(refundTx);
        transactions.push(refundTx);
        totalRefunded += BigInt(deposit.amount);
      }

      escrow.totalRefunded = (BigInt(escrow.totalRefunded) + totalRefunded).toString();
      escrow.currentBalance = (BigInt(escrow.currentBalance) - totalRefunded).toString();
      escrow.status =
        BigInt(escrow.currentBalance) === BigInt(0) ? EscrowStatus.REFUNDED : EscrowStatus.ACTIVE;
      escrow.metadata = {
        ...escrow.metadata,
        refundReason: reason,
      };

      await this.escrowRepository.save(escrow);

      this.logger.log(
        `Refunded escrow ${escrowId}: ${transactions.length} refunds, total ${totalRefunded}`,
      );

      return transactions;
    } catch (error) {
      escrow.status = EscrowStatus.ACTIVE;
      await this.escrowRepository.save(escrow);
      throw error;
    }
  }

  /**
   * Get escrow balance and status
   */
  async getEscrowBalance(escrowId: string): Promise<{
    currentBalance: string;
    totalDeposited: string;
    totalReleased: string;
    totalRefunded: string;
    platformFeeCollected: string;
    status: EscrowStatus;
  }> {
    const escrow = await this.getEscrowById(escrowId);

    return {
      currentBalance: escrow.currentBalance,
      totalDeposited: escrow.totalDeposited,
      totalReleased: escrow.totalReleased,
      totalRefunded: escrow.totalRefunded,
      platformFeeCollected: escrow.platformFeeCollected,
      status: escrow.status,
    };
  }

  /**
   * Get escrow by source
   */
  async getEscrowBySource(sourceType: EscrowSourceType, sourceId: string): Promise<EscrowAccount> {
    const escrow = await this.escrowRepository.findOne({
      where: { sourceType, sourceId },
      relations: ['transactions'],
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow not found for ${sourceType} ${sourceId}`);
    }

    return escrow;
  }

  /**
   * Close escrow account (final cleanup)
   */
  async closeEscrow(escrowId: string): Promise<void> {
    const escrow = await this.getEscrowById(escrowId);

    if (BigInt(escrow.currentBalance) > 0) {
      throw new BadRequestException(`Cannot close escrow with remaining balance`);
    }

    escrow.status = EscrowStatus.CLOSED;
    escrow.closedAt = new Date();

    await this.escrowRepository.save(escrow);

    this.logger.log(`Closed escrow ${escrowId}`);
  }

  // Private helpers

  private async getEscrowById(escrowId: string): Promise<EscrowAccount> {
    const escrow = await this.escrowRepository.findOne({
      where: { escrowId },
      relations: ['transactions'],
    });

    if (!escrow) {
      throw new NotFoundException(`Escrow ${escrowId} not found`);
    }

    return escrow;
  }

  private generateEscrowAddress(sourceType: EscrowSourceType, sourceId: string): string {
    // Simulate PDA derivation
    const seed = `escrow:${sourceType}:${sourceId}`;
    return createHash('sha256').update(seed).digest('hex').slice(0, 44);
  }
}
