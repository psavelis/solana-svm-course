import { Injectable } from "@nestjs/common";
import { PublicKey, SystemProgram } from "@solana/web3.js";

@Injectable()
/**
 * Service for managing Program Derived Addresses (PDAs) in Solana.
 * PDAs provide deterministic address derivation for program-owned accounts.
 *
 * @see https://docs.solana.com/developing/programming-model/calling-between-programs#program-derived-addresses
 */
export class PdaService {
  /**
   * Derives a Program Derived Address using the provided seeds.
   *
   * @param programId - The program ID to derive the PDA for
   * @param seeds - Array of seeds to use for derivation
   * @returns Object containing the PDA address and bump seed
   */
  async derivePDA(
    programId: PublicKey,
    seeds: (Uint8Array | Buffer | PublicKey | string | number)[]
  ): Promise<{ address: PublicKey; bump: number }> {
    // Convert seeds to proper format
    const seedBuffers = seeds.map(seed => {
      if (typeof seed === 'string') {
        return Buffer.from(seed);
      } else if (typeof seed === 'number') {
        return Buffer.from([seed]);
      } else if (seed instanceof PublicKey) {
        return seed.toBuffer();
      } else if (seed instanceof Buffer) {
        return seed;
      } else {
        return Buffer.from(seed);
      }
    });

    try {
      const [address, bump] = await PublicKey.findProgramAddress(
        seedBuffers,
        programId
      );

      return { address, bump };
    } catch (error) {
      throw new Error(`Failed to derive PDA: ${error.message}`);
    }
  }

  /**
   * Derives a PDA for account ownership using owner address and account type.
   *
   * @param programId - The program ID
   * @param ownerAddress - The owner public key
   * @param accountType - Type of account (e.g., 'token', 'nft', 'vault')
   * @returns PDA details
   */
  async deriveAccountPDA(
    programId: PublicKey,
    ownerAddress: PublicKey,
    accountType: string
  ): Promise<{ address: PublicKey; bump: number }> {
    const seeds = [
      Buffer.from('account'),
      ownerAddress.toBuffer(),
      Buffer.from(accountType),
    ];

    return this.derivePDA(programId, seeds);
  }

  /**
   * Derives a PDA for token accounts using mint and owner.
   *
   * @param tokenProgramId - SPL Token program ID
   * @param mintAddress - Token mint address
   * @param ownerAddress - Token account owner
   * @returns Associated Token Account address (ATA)
   */
  async deriveAssociatedTokenAccount(
    tokenProgramId: PublicKey,
    mintAddress: PublicKey,
    ownerAddress: PublicKey
  ): Promise<PublicKey> {
    // Use the standard ATA derivation
    // ATA address = findProgramAddress([owner, tokenProgramId, mint], associatedTokenProgramId)
    const associatedTokenProgramId = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

    const seeds = [
      ownerAddress.toBuffer(),
      tokenProgramId.toBuffer(),
      mintAddress.toBuffer(),
    ];

    const [address] = await PublicKey.findProgramAddress(
      seeds,
      associatedTokenProgramId
    );

    return address;
  }

  /**
   * Validates if an address is a valid PDA for the given program.
   *
   * @param address - Address to validate
   * @param programId - Program ID
   * @param seeds - Seeds used for derivation
   * @returns True if address is valid PDA
   */
  async validatePDA(
    address: PublicKey,
    programId: PublicKey,
    seeds: (Uint8Array | Buffer | PublicKey | string | number)[]
  ): Promise<boolean> {
    try {
      const { address: derivedAddress } = await this.derivePDA(programId, seeds);
      return derivedAddress.equals(address);
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates multiple PDAs with different seeds for batch operations.
   *
   * @param programId - Program ID
   * @param seedMatrix - Array of seed arrays
   * @returns Array of PDA results
   */
  async deriveMultiplePDAs(
    programId: PublicKey,
    seedMatrix: (Uint8Array | Buffer | PublicKey | string | number)[][]
  ): Promise<Array<{ address: PublicKey; bump: number; seeds: any[] }>> {
    const results = await Promise.all(
      seedMatrix.map(async (seeds) => {
        const result = await this.derivePDA(programId, seeds);
        return {
          ...result,
          seeds
        };
      })
    );

    return results;
  }

  /**
   * Derives a PDA for escrow/vault accounts.
   *
   * @param programId - Program ID
   * @param escrowId - Unique escrow identifier
   * @param authority - Authority public key
   * @returns Escrow PDA details
   */
  async deriveEscrowPDA(
    programId: PublicKey,
    escrowId: string | Buffer,
    authority: PublicKey
  ): Promise<{ address: PublicKey; bump: number }> {
    const seeds = [
      Buffer.from('escrow'),
      typeof escrowId === 'string' ? Buffer.from(escrowId) : escrowId,
      authority.toBuffer(),
    ];

    return this.derivePDA(programId, seeds);
  }

  /**
   * Derives a PDA for metadata accounts (useful for NFTs).
   *
   * @param metadataProgramId - Metaplex metadata program ID
   * @param mintAddress - NFT mint address
   * @returns Metadata account PDA
   */
  async deriveMetadataPDA(
    metadataProgramId: PublicKey,
    mintAddress: PublicKey
  ): Promise<PublicKey> {
    const seeds = [
      Buffer.from('metadata'),
      metadataProgramId.toBuffer(),
      mintAddress.toBuffer(),
    ];

    const [address] = await PublicKey.findProgramAddress(
      seeds,
      metadataProgramId
    );

    return address;
  }

  /**
   * Derives a PDA for master edition accounts (NFTs).
   *
   * @param metadataProgramId - Metaplex metadata program ID
   * @param mintAddress - NFT mint address
   * @returns Master edition PDA
   */
  async deriveMasterEditionPDA(
    metadataProgramId: PublicKey,
    mintAddress: PublicKey
  ): Promise<PublicKey> {
    const seeds = [
      Buffer.from('metadata'),
      metadataProgramId.toBuffer(),
      mintAddress.toBuffer(),
      Buffer.from('edition'),
    ];

    const [address] = await PublicKey.findProgramAddress(
      seeds,
      metadataProgramId
    );

    return address;
  }
}