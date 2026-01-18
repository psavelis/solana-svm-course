import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Connection, PublicKey } from '@solana/web3.js';

import {
  PlayerWallet,
  PlayerWalletStatus,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
} from '../entities/player-wallet.entity';
import { MpcService } from '../../mpc/mpc.service';
import { ThresholdScheme } from '../../mpc/mpc-wallet.entity';

export interface CreatePlayerWalletRequest {
  playerId: string;
  metadata?: {
    displayName?: string;
    email?: string;
    kycVerified?: boolean;
  };
}

export interface DepositRequest {
  playerId: string;
  amount: string;
  signature: string;
  fromAddress?: string;
}

export interface WithdrawRequest {
  playerId: string;
  amount: string;
  destinationAddress: string;
}

export interface LockFundsRequest {
  playerId: string;
  amount: string;
  reference: string; // matchId or tournamentId
}

export interface UnlockFundsRequest {
  playerId: string;
  amount: string;
  reference: string;
}

export interface TransferRequest {
  fromPlayerId: string;
  toPlayerId: string;
  amount: string;
  reference?: string;
}

const LAMPORTS_PER_SOL = 1_000_000_000;
const DEFAULT_DAILY_WITHDRAWAL_LIMIT = BigInt(10) * BigInt(LAMPORTS_PER_SOL); // 10 SOL
const WITHDRAWAL_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class PlayerWalletService {
  private readonly logger = new Logger(PlayerWalletService.name);
  private connection: Connection;

  constructor(
    @InjectRepository(PlayerWallet)
    private walletRepository: Repository<PlayerWallet>,
    @InjectRepository(WalletTransaction)
    private txRepository: Repository<WalletTransaction>,
    private readonly mpcService: MpcService,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    );
  }

  /**
   * Create a new MPC-secured player wallet
   */
  async createWallet(request: CreatePlayerWalletRequest): Promise<PlayerWallet> {
    const { playerId, metadata } = request;

    // Check for existing wallet
    const existing = await this.walletRepository.findOne({
      where: { playerId },
    });

    if (existing) {
      throw new BadRequestException(`Wallet already exists for player ${playerId}`);
    }

    // Create MPC wallet with 2-of-3 threshold scheme
    const mpcWallet = await this.mpcService.createMpcWallet({
      name: `Player Wallet - ${playerId}`,
      thresholdScheme: ThresholdScheme.TSS_2_3,
      participants: [
        {
          participantId: `player_${playerId}`,
          participantPublicKey: `pk_player_${randomBytes(16).toString('hex')}`,
        },
        {
          participantId: 'platform_signer',
          participantPublicKey: `pk_platform_${randomBytes(16).toString('hex')}`,
        },
        {
          participantId: 'recovery_service',
          participantPublicKey: `pk_recovery_${randomBytes(16).toString('hex')}`,
        },
      ],
      metadata: {
        description: `Esports earnings wallet for ${playerId}`,
        tags: ['esports', 'player-wallet'],
        createdBy: 'esports-platform',
      },
    });

    // Create player wallet record
    const wallet = this.walletRepository.create({
      playerId,
      mpcWalletId: mpcWallet.walletId,
      publicKey: mpcWallet.publicKey,
      availableBalance: '0',
      lockedBalance: '0',
      totalDeposited: '0',
      totalWithdrawn: '0',
      totalWinnings: '0',
      totalEntryFees: '0',
      status: PlayerWalletStatus.ACTIVE,
      dailyWithdrawalAmount: '0',
      dailyWithdrawalResetAt: this.getNextDayReset(),
      metadata,
      transactions: [],
    });

    const savedWallet = await this.walletRepository.save(wallet);

    this.logger.log(`Created MPC wallet for player ${playerId}: ${savedWallet.publicKey}`);

    return savedWallet;
  }

  /**
   * Get player wallet
   */
  async getWallet(playerId: string): Promise<PlayerWallet> {
    const wallet = await this.walletRepository.findOne({
      where: { playerId },
      relations: ['transactions'],
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for player ${playerId}`);
    }

    return wallet;
  }

  /**
   * Get wallet balance
   */
  async getBalance(playerId: string): Promise<{
    availableBalance: string;
    lockedBalance: string;
    totalBalance: string;
  }> {
    const wallet = await this.getWallet(playerId);

    return {
      availableBalance: wallet.availableBalance,
      lockedBalance: wallet.lockedBalance,
      totalBalance: wallet.getTotalBalance().toString(),
    };
  }

  /**
   * Record deposit to wallet
   */
  async deposit(request: DepositRequest): Promise<WalletTransaction> {
    const { playerId, amount, signature, fromAddress } = request;

    const wallet = await this.getWallet(playerId);

    if (!wallet.isActive()) {
      throw new BadRequestException(`Wallet for player ${playerId} is not active`);
    }

    // Verify transaction on-chain (simplified)
    // In production, verify the signature matches an actual deposit to the wallet address

    const tx = this.txRepository.create({
      walletId: wallet.id,
      type: WalletTransactionType.DEPOSIT,
      amount,
      signature,
      status: WalletTransactionStatus.COMPLETED,
      metadata: {
        fromAddress,
        toAddress: wallet.publicKey,
      },
    });

    await this.txRepository.save(tx);

    // Update wallet balance
    wallet.availableBalance = (BigInt(wallet.availableBalance) + BigInt(amount)).toString();
    wallet.totalDeposited = (BigInt(wallet.totalDeposited) + BigInt(amount)).toString();

    await this.walletRepository.save(wallet);

    this.logger.log(`Deposited ${amount} lamports to wallet ${playerId}`);

    return tx;
  }

  /**
   * Withdraw from wallet using MPC signing
   */
  async withdraw(request: WithdrawRequest): Promise<WalletTransaction> {
    const { playerId, amount, destinationAddress } = request;

    const wallet = await this.getWallet(playerId);

    if (!wallet.isActive()) {
      throw new BadRequestException(`Wallet for player ${playerId} is not active`);
    }

    if (!wallet.canWithdraw(BigInt(amount))) {
      throw new BadRequestException(`Insufficient available balance`);
    }

    // Check withdrawal limits
    await this.checkWithdrawalLimits(wallet, BigInt(amount));

    // Check cooldown
    if (wallet.lastWithdrawalAt) {
      const timeSinceLastWithdrawal = Date.now() - wallet.lastWithdrawalAt.getTime();
      if (timeSinceLastWithdrawal < WITHDRAWAL_COOLDOWN_MS) {
        const remainingTime = Math.ceil((WITHDRAWAL_COOLDOWN_MS - timeSinceLastWithdrawal) / 1000);
        throw new BadRequestException(
          `Withdrawal cooldown active. Please wait ${remainingTime} seconds`,
        );
      }
    }

    // Create pending transaction
    const tx = this.txRepository.create({
      walletId: wallet.id,
      type: WalletTransactionType.WITHDRAWAL,
      amount,
      status: WalletTransactionStatus.PROCESSING,
      metadata: {
        fromAddress: wallet.publicKey,
        toAddress: destinationAddress,
      },
    });

    await this.txRepository.save(tx);

    try {
      // Build and sign transaction using MPC
      const transactionData = this.buildWithdrawalTransaction(
        wallet.publicKey,
        destinationAddress,
        amount,
      );

      // Sign with MPC (requires player + platform shares)
      const signatureResult = await this.mpcService.signTransaction({
        walletId: wallet.mpcWalletId,
        transactionData,
        participantShares: [
          {
            participantId: `player_${playerId}`,
            signatureShare: `share_player_${randomBytes(32).toString('hex')}`,
          },
          {
            participantId: 'platform_signer',
            signatureShare: `share_platform_${randomBytes(32).toString('hex')}`,
          },
        ],
      });

      // Update transaction with signature
      tx.signature = signatureResult.completeSignature;
      tx.status = WalletTransactionStatus.COMPLETED;
      await this.txRepository.save(tx);

      // Update wallet balance
      wallet.availableBalance = (BigInt(wallet.availableBalance) - BigInt(amount)).toString();
      wallet.totalWithdrawn = (BigInt(wallet.totalWithdrawn) + BigInt(amount)).toString();
      wallet.dailyWithdrawalAmount = (
        BigInt(wallet.dailyWithdrawalAmount) + BigInt(amount)
      ).toString();
      wallet.lastWithdrawalAt = new Date();

      await this.walletRepository.save(wallet);

      this.logger.log(
        `Withdrew ${amount} lamports from wallet ${playerId} to ${destinationAddress}`,
      );

      return tx;
    } catch (error) {
      tx.status = WalletTransactionStatus.FAILED;
      tx.failureReason = error.message;
      await this.txRepository.save(tx);
      throw error;
    }
  }

  /**
   * Lock funds for match entry
   */
  async lockFunds(request: LockFundsRequest): Promise<WalletTransaction> {
    const { playerId, amount, reference } = request;

    const wallet = await this.getWallet(playerId);

    if (!wallet.canLock(BigInt(amount))) {
      throw new BadRequestException(`Insufficient available balance to lock`);
    }

    const tx = this.txRepository.create({
      walletId: wallet.id,
      type: WalletTransactionType.ENTRY_FEE,
      amount,
      reference,
      status: WalletTransactionStatus.COMPLETED,
      metadata: {
        matchId: reference,
      },
    });

    await this.txRepository.save(tx);

    // Move from available to locked
    wallet.availableBalance = (BigInt(wallet.availableBalance) - BigInt(amount)).toString();
    wallet.lockedBalance = (BigInt(wallet.lockedBalance) + BigInt(amount)).toString();
    wallet.totalEntryFees = (BigInt(wallet.totalEntryFees) + BigInt(amount)).toString();

    await this.walletRepository.save(wallet);

    this.logger.log(`Locked ${amount} lamports for player ${playerId}, reference: ${reference}`);

    return tx;
  }

  /**
   * Unlock funds (match cancelled / refund)
   */
  async unlockFunds(request: UnlockFundsRequest): Promise<WalletTransaction> {
    const { playerId, amount, reference } = request;

    const wallet = await this.getWallet(playerId);

    if (BigInt(wallet.lockedBalance) < BigInt(amount)) {
      throw new BadRequestException(`Insufficient locked balance to unlock`);
    }

    const tx = this.txRepository.create({
      walletId: wallet.id,
      type: WalletTransactionType.REFUND,
      amount,
      reference,
      status: WalletTransactionStatus.COMPLETED,
      metadata: {
        matchId: reference,
      },
    });

    await this.txRepository.save(tx);

    // Move from locked back to available
    wallet.lockedBalance = (BigInt(wallet.lockedBalance) - BigInt(amount)).toString();
    wallet.availableBalance = (BigInt(wallet.availableBalance) + BigInt(amount)).toString();

    await this.walletRepository.save(wallet);

    this.logger.log(`Unlocked ${amount} lamports for player ${playerId}, reference: ${reference}`);

    return tx;
  }

  /**
   * Credit prize winnings
   */
  async creditPrize(
    playerId: string,
    amount: string,
    reference: string,
    signature?: string,
  ): Promise<WalletTransaction> {
    const wallet = await this.getWallet(playerId);

    const tx = this.txRepository.create({
      walletId: wallet.id,
      type: WalletTransactionType.PRIZE_WIN,
      amount,
      signature,
      reference,
      status: WalletTransactionStatus.COMPLETED,
      metadata: {
        matchId: reference,
      },
    });

    await this.txRepository.save(tx);

    // Add to available balance
    wallet.availableBalance = (BigInt(wallet.availableBalance) + BigInt(amount)).toString();
    wallet.totalWinnings = (BigInt(wallet.totalWinnings) + BigInt(amount)).toString();

    // Release any locked balance for this match
    // (entry fee is already deducted, this is net winnings)

    await this.walletRepository.save(wallet);

    this.logger.log(
      `Credited ${amount} lamports prize to player ${playerId}, reference: ${reference}`,
    );

    return tx;
  }

  /**
   * Deduct locked funds for entry fee (transfer to escrow)
   */
  async deductEntryFee(playerId: string, amount: string, reference: string): Promise<void> {
    const wallet = await this.getWallet(playerId);

    if (BigInt(wallet.lockedBalance) < BigInt(amount)) {
      throw new BadRequestException(`Insufficient locked balance`);
    }

    // Simply reduce locked balance (funds already moved to escrow conceptually)
    wallet.lockedBalance = (BigInt(wallet.lockedBalance) - BigInt(amount)).toString();

    await this.walletRepository.save(wallet);

    this.logger.log(`Deducted ${amount} lamports entry fee from player ${playerId}`);
  }

  /**
   * Get wallet transactions
   */
  async getTransactions(
    playerId: string,
    options?: {
      type?: WalletTransactionType;
      status?: WalletTransactionStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<WalletTransaction[]> {
    const wallet = await this.getWallet(playerId);

    const query = this.txRepository
      .createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId: wallet.id });

    if (options?.type) {
      query.andWhere('tx.type = :type', { type: options.type });
    }

    if (options?.status) {
      query.andWhere('tx.status = :status', { status: options.status });
    }

    query.orderBy('tx.createdAt', 'DESC');

    if (options?.limit) {
      query.limit(options.limit);
    }

    if (options?.offset) {
      query.offset(options.offset);
    }

    return query.getMany();
  }

  // Private helpers

  private async checkWithdrawalLimits(wallet: PlayerWallet, amount: bigint): Promise<void> {
    // Reset daily limit if needed
    if (wallet.dailyWithdrawalResetAt && new Date() > wallet.dailyWithdrawalResetAt) {
      wallet.dailyWithdrawalAmount = '0';
      wallet.dailyWithdrawalResetAt = this.getNextDayReset();
      await this.walletRepository.save(wallet);
    }

    const dailyLimit = BigInt(
      process.env.WITHDRAWAL_DAILY_LIMIT_LAMPORTS || DEFAULT_DAILY_WITHDRAWAL_LIMIT.toString(),
    );
    const currentDaily = BigInt(wallet.dailyWithdrawalAmount);

    if (currentDaily + amount > dailyLimit) {
      throw new BadRequestException(
        `Withdrawal would exceed daily limit. Current: ${currentDaily}, Requested: ${amount}, Limit: ${dailyLimit}`,
      );
    }
  }

  private getNextDayReset(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  private buildWithdrawalTransaction(
    fromAddress: string,
    toAddress: string,
    amount: string,
  ): string {
    // Simplified transaction data for MPC signing
    const txData = {
      type: 'withdrawal',
      from: fromAddress,
      to: toAddress,
      amount,
      timestamp: Date.now(),
    };

    return Buffer.from(JSON.stringify(txData)).toString('base64');
  }
}
