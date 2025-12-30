import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  MpcWallet,
  MpcWalletStatus,
  ThresholdScheme,
} from "./mpc-wallet.entity";
import { KeyShare, KeyShareStatus, KeyShareType } from "./key-share.entity";
import { randomBytes } from "crypto";
import { createHash } from "crypto";

export interface CreateMpcWalletRequest {
  name: string;
  thresholdScheme: ThresholdScheme;
  participants: Array<{
    participantId: string;
    participantPublicKey: string;
  }>;
  metadata?: {
    description?: string;
    tags?: string[];
    createdBy?: string;
  };
}

export interface MpcWalletResponse {
  id: string;
  walletId: string;
  name: string;
  thresholdScheme: ThresholdScheme;
  totalShares: number;
  threshold: number;
  publicKey: string;
  status: MpcWalletStatus;
  activeShares: number;
  canSign: boolean;
  createdAt: Date;
}

export interface KeyShareResponse {
  id: string;
  participantId: string;
  shareIndex: number;
  status: KeyShareStatus;
  type: KeyShareType;
  lastUsedAt?: Date;
  createdAt: Date;
}

export interface SignTransactionRequest {
  walletId: string;
  transactionData: string; // Base64 encoded transaction
  participantShares: Array<{
    participantId: string;
    signatureShare: string; // Partial signature from this participant
  }>;
}

export interface SignatureReconstructionResult {
  completeSignature: string;
  publicKey: string;
  reconstructed: boolean;
  participantsUsed: number;
}

@Injectable()
/**
 * Service for Multi-Party Computation (MPC) wallet operations.
 * @see docs/diagrams/08-mpc.md
 */
export class MpcService {
  private readonly logger = new Logger(MpcService.name);

  constructor(
    @InjectRepository(MpcWallet)
    private mpcWalletRepository: Repository<MpcWallet>,
    @InjectRepository(KeyShare)
    private keyShareRepository: Repository<KeyShare>,
  ) {}

  /**
   * Create a new MPC wallet with distributed key generation
   */
  async createMpcWallet(
    request: CreateMpcWalletRequest,
  ): Promise<MpcWalletResponse> {
    const { name, thresholdScheme, participants, metadata } = request;

    // Validate participants
    if (participants.length < 2) {
      throw new BadRequestException(
        "MPC wallet requires at least 2 participants",
      );
    }

    // Determine threshold parameters
    const { totalShares, threshold } =
      this.getThresholdParameters(thresholdScheme);

    if (participants.length !== totalShares) {
      throw new BadRequestException(
        `Threshold scheme ${thresholdScheme} requires exactly ${totalShares} participants, got ${participants.length}`,
      );
    }

    try {
      // Generate distributed key shares (simplified implementation)
      const { publicKey, keyShares } = await this.generateDistributedKey(
        totalShares,
        participants,
      );

      // Create wallet
      const wallet = this.mpcWalletRepository.create({
        walletId: this.generateWalletId(),
        name,
        thresholdScheme,
        totalShares,
        threshold,
        publicKey,
        status: MpcWalletStatus.ACTIVE,
        metadata,
        keyShares: [],
      });

      const savedWallet = await this.mpcWalletRepository.save(wallet);

      // Create key shares
      const keyShareEntities = keyShares.map((share, index) => {
        const participant = participants[index];
        return this.keyShareRepository.create({
          walletId: savedWallet.id,
          wallet: savedWallet,
          participantId: participant.participantId,
          shareIndex: index,
          encryptedShare: share.encryptedData,
          participantPublicKey: participant.participantPublicKey,
          status: KeyShareStatus.ACTIVE,
          type: KeyShareType.ORIGINAL,
          metadata: {
            deviceId: `device-${participant.participantId}`,
          },
        });
      });

      await this.keyShareRepository.save(keyShareEntities);

      // Reload wallet with key shares
      const walletWithShares = await this.mpcWalletRepository.findOne({
        where: { id: savedWallet.id },
        relations: ["keyShares"],
      });

      if (!walletWithShares) {
        throw new Error("Failed to load wallet with shares");
      }

      return this.mapWalletToResponse(walletWithShares);
    } catch (error) {
      this.logger.error("Failed to create MPC wallet", error);
      throw new BadRequestException(
        `Failed to create MPC wallet: ${error.message}`,
      );
    }
  }

  /**
   * Get all MPC wallets
   */
  async getMpcWallets(): Promise<MpcWalletResponse[]> {
    const wallets = await this.mpcWalletRepository.find({
      relations: ["keyShares"],
      order: { createdAt: "DESC" },
    });

    return wallets.map((wallet) => this.mapWalletToResponse(wallet));
  }

  /**
   * Get a specific MPC wallet by ID
   */
  async getMpcWallet(walletId: string): Promise<MpcWalletResponse> {
    const wallet = await this.mpcWalletRepository.findOne({
      where: { walletId },
      relations: ["keyShares"],
    });

    if (!wallet) {
      throw new NotFoundException(`MPC wallet ${walletId} not found`);
    }

    return this.mapWalletToResponse(wallet);
  }

  /**
   * Get key shares for a wallet (for a specific participant)
   */
  async getWalletKeyShares(
    walletId: string,
    participantId: string,
  ): Promise<KeyShareResponse[]> {
    const shares = await this.keyShareRepository.find({
      where: {
        walletId: (await this.getWalletByWalletId(walletId)).id,
        participantId,
        status: KeyShareStatus.ACTIVE,
      },
      order: { createdAt: "DESC" },
    });

    return shares.map((share) => this.mapKeyShareToResponse(share));
  }

  /**
   * Sign a transaction using MPC threshold signatures
   */
  async signTransaction(
    request: SignTransactionRequest,
  ): Promise<SignatureReconstructionResult> {
    const { walletId, transactionData, participantShares } = request;

    const wallet = await this.getWalletByWalletId(walletId);

    if (!wallet.isActive()) {
      throw new BadRequestException(`MPC wallet ${walletId} is not active`);
    }

    if (participantShares.length < wallet.threshold) {
      throw new BadRequestException(
        `Insufficient shares: got ${participantShares.length}, need ${wallet.threshold}`,
      );
    }

    try {
      // Validate participant shares
      const validShares = await this.validateParticipantShares(
        wallet,
        participantShares,
      );

      if (validShares.length < wallet.threshold) {
        throw new BadRequestException(
          `Insufficient valid shares: got ${validShares.length}, need ${wallet.threshold}`,
        );
      }

      // Reconstruct signature from shares (simplified implementation)
      const signature = await this.reconstructSignature(
        transactionData,
        validShares,
      );

      // Update last used timestamps
      await this.updateShareUsage(validShares);

      return {
        completeSignature: signature,
        publicKey: wallet.publicKey,
        reconstructed: true,
        participantsUsed: validShares.length,
      };
    } catch (error) {
      this.logger.error("Failed to sign transaction with MPC", error);
      throw new BadRequestException(`MPC signing failed: ${error.message}`);
    }
  }

  /**
   * Revoke a key share (for security or recovery)
   */
  async revokeKeyShare(
    walletId: string,
    participantId: string,
    shareIndex: number,
  ): Promise<void> {
    const wallet = await this.getWalletByWalletId(walletId);

    const share = await this.keyShareRepository.findOne({
      where: {
        walletId: wallet.id,
        participantId,
        shareIndex,
      },
    });

    if (!share) {
      throw new NotFoundException(
        `Key share not found for participant ${participantId}`,
      );
    }

    if (share.status === KeyShareStatus.REVOKED) {
      return; // Already revoked
    }

    share.status = KeyShareStatus.REVOKED;
    await this.keyShareRepository.save(share);

    // Check if wallet can still sign
    const activeShares = wallet.getActiveSharesCount() - 1;
    if (activeShares < wallet.threshold) {
      wallet.status = MpcWalletStatus.RECOVERING;
      await this.mpcWalletRepository.save(wallet);
    }
  }

  // Private helper methods

  private getThresholdParameters(scheme: ThresholdScheme): {
    totalShares: number;
    threshold: number;
  } {
    switch (scheme) {
      case ThresholdScheme.TSS_2_3:
        return { totalShares: 3, threshold: 2 };
      case ThresholdScheme.TSS_3_5:
        return { totalShares: 5, threshold: 3 };
      case ThresholdScheme.TSS_4_7:
        return { totalShares: 7, threshold: 4 };
      default:
        throw new BadRequestException(
          `Unsupported threshold scheme: ${scheme}`,
        );
    }
  }

  private generateWalletId(): string {
    return `mpc_${randomBytes(8).toString("hex")}`;
  }

  private async getWalletByWalletId(walletId: string): Promise<MpcWallet> {
    const wallet = await this.mpcWalletRepository.findOne({
      where: { walletId },
      relations: ["keyShares"],
    });

    if (!wallet) {
      throw new NotFoundException(`MPC wallet ${walletId} not found`);
    }

    return wallet;
  }

  private async generateDistributedKey(
    totalShares: number,
    participants: Array<{
      participantId: string;
      participantPublicKey: string;
    }>,
  ): Promise<{
    publicKey: string;
    keyShares: Array<{ encryptedData: string }>;
  }> {
    // Simplified distributed key generation
    // In a real implementation, this would use proper threshold cryptography

    // Generate a master key (simplified)
    const masterKey = randomBytes(32);
    const publicKey = createHash("sha256").update(masterKey).digest("hex");

    // Create shares (simplified - in reality would use Shamir's secret sharing)
    const keyShares = participants.map((participant, index) => {
      // Create a unique share for each participant
      const shareData = Buffer.concat([
        masterKey,
        Buffer.from(participant.participantId),
        Buffer.from(index.toString()),
      ]);

      // Encrypt the share (simplified encryption)
      const encryptedData = createHash("sha256")
        .update(shareData)
        .digest("base64");

      return { encryptedData };
    });

    return { publicKey, keyShares };
  }

  private async validateParticipantShares(
    wallet: MpcWallet,
    participantShares: Array<{ participantId: string; signatureShare: string }>,
  ): Promise<
    Array<{ participantId: string; signatureShare: string; share: KeyShare }>
  > {
    const validShares: Array<{
      participantId: string;
      signatureShare: string;
      share: KeyShare;
    }> = [];

    for (const participantShare of participantShares) {
      const { participantId, signatureShare } = participantShare;

      // Find the participant's key share
      const share = wallet.keyShares.find(
        (s) => s.participantId === participantId && s.isActive(),
      );

      if (!share) {
        this.logger.warn(
          `Invalid or inactive share for participant ${participantId}`,
        );
        continue;
      }

      // Validate signature share format (simplified)
      if (!signatureShare || signatureShare.length < 10) {
        this.logger.warn(
          `Invalid signature share format for participant ${participantId}`,
        );
        continue;
      }

      validShares.push({ participantId, signatureShare, share });
    }

    return validShares;
  }

  private async reconstructSignature(
    transactionData: string,
    validShares: Array<{
      participantId: string;
      signatureShare: string;
      share: KeyShare;
    }>,
  ): Promise<string> {
    // Simplified signature reconstruction
    // In a real implementation, this would combine signature shares using threshold cryptography

    // Combine signature shares (simplified)
    const combinedData = validShares
      .map((s) => s.signatureShare)
      .sort()
      .join("");

    // Create final signature (simplified)
    const signature = createHash("sha256")
      .update(Buffer.from(combinedData + transactionData))
      .digest("base64");

    return signature;
  }

  private async updateShareUsage(
    validShares: Array<{ share: KeyShare }>,
  ): Promise<void> {
    for (const { share } of validShares) {
      share.markAsUsed();
    }

    await this.keyShareRepository.save(validShares.map((s) => s.share));
  }

  private mapWalletToResponse(wallet: MpcWallet): MpcWalletResponse {
    return {
      id: wallet.id,
      walletId: wallet.walletId,
      name: wallet.name,
      thresholdScheme: wallet.thresholdScheme,
      totalShares: wallet.totalShares,
      threshold: wallet.threshold,
      publicKey: wallet.publicKey,
      status: wallet.status,
      activeShares: wallet.getActiveSharesCount(),
      canSign: wallet.canSign(),
      createdAt: wallet.createdAt,
    };
  }

  private mapKeyShareToResponse(share: KeyShare): KeyShareResponse {
    return {
      id: share.id,
      participantId: share.participantId,
      shareIndex: share.shareIndex,
      status: share.status,
      type: share.type,
      lastUsedAt: share.lastUsedAt,
      createdAt: share.createdAt,
    };
  }
}
