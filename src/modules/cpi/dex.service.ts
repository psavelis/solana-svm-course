import { Injectable, Logger } from "@nestjs/common";
import { CpiService } from "../cpi/cpi.service";

@Injectable()
export class DexService {
  private readonly logger = new Logger(DexService.name);

  constructor(private readonly cpiService: CpiService) {}

  /**
   * Simulate a DEX swap using CPI
   */
  async performSwap(
    userId: string,
    fromMint: string,
    toMint: string,
    amount: number,
    dexProgramId: string,
  ) {
    this.logger.log(`Performing DEX swap: ${amount} ${fromMint} -> ${toMint}`);

    // Create CPI instruction for the swap
    const swapInstruction = await this.cpiService.createInstruction({
      programId: dexProgramId,
      callerProgramId: "dex-service-program", // This would be a real program ID
      instructionData: {
        method: "swap",
        fromMint,
        toMint,
        amount,
        userId,
      },
      accounts: [
        { pubkey: userId, isSigner: true, isWritable: true },
        { pubkey: fromMint, isSigner: false, isWritable: false },
        { pubkey: toMint, isSigner: false, isWritable: false },
      ],
      requiresPermission: true,
      permissionLevel: "write",
    });

    // Execute the CPI
    const result = await this.cpiService.executeCpi({
      transactionId: `swap-${Date.now()}`,
      callerProgramId: "dex-service-program",
      targetProgramId: dexProgramId,
      instructionName: "swap",
      instructionData: {
        method: "swap",
        fromMint,
        toMint,
        amount,
        userId,
      },
      accounts: [
        { pubkey: userId, isSigner: true, isWritable: true },
        { pubkey: fromMint, isSigner: false, isWritable: false },
        { pubkey: toMint, isSigner: false, isWritable: false },
      ],
    });

    return {
      swapId: result.id,
      status: result.status,
      gasUsed: result.gasUsed,
      result: result.returnData,
    };
  }

  /**
   * Get swap history using CPI invocation tracking
   */
  async getSwapHistory(userId?: string) {
    return await this.cpiService.getInvocationHistory(
      undefined, // Any program
      userId ? `dex-service-program-${userId}` : undefined,
    );
  }
}
