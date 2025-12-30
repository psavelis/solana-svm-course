import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Token } from "./token.entity";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

@Injectable()
/**
 * Service for managing SPL tokens.
 * @see docs/diagrams/03-token-standards.md
 */
export class TokensService {
  private connection: Connection;

  constructor(
    @InjectRepository(Token)
    private tokensRepository: Repository<Token>,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    );
  }

  async create(tokenData: Partial<Token>): Promise<Token> {
    const token = this.tokensRepository.create(tokenData);
    return this.tokensRepository.save(token);
  }

  async findAll(): Promise<Token[]> {
    return this.tokensRepository.find();
  }

  async findOne(id: string): Promise<Token> {
    return this.tokensRepository.findOne({ where: { id } });
  }

  async findByMint(mintAddress: string): Promise<Token> {
    return this.tokensRepository.findOne({ where: { mintAddress } });
  }

  async update(id: string, updateData: Partial<Token>): Promise<Token> {
    await this.tokensRepository.update(id, updateData);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.tokensRepository.delete(id);
  }

  async getTokenInfo(mintAddress: string) {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await this.connection.getAccountInfo(mintPublicKey);

      if (!mintInfo) {
        throw new Error("Token mint not found");
      }

      // Parse mint data (simplified)
      return {
        mintAddress,
        supply: mintInfo.data.slice(36, 44).readBigUInt64LE().toString(),
        decimals: mintInfo.data[44],
        owner: new PublicKey(mintInfo.data.slice(0, 32)).toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error.message}`);
    }
  }

  async getTokenBalance(
    ownerAddress: string,
    mintAddress: string,
  ): Promise<string> {
    try {
      const ownerPublicKey = new PublicKey(ownerAddress);
      const mintPublicKey = new PublicKey(mintAddress);

      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerPublicKey,
      );

      const accountInfo = await getAccount(
        this.connection,
        associatedTokenAddress,
      );
      return accountInfo.amount.toString();
    } catch (error) {
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  async getTokenAccounts(ownerAddress: string) {
    try {
      const ownerPublicKey = new PublicKey(ownerAddress);
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        ownerPublicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        },
      );

      return tokenAccounts.value.map((account) => ({
        address: account.account.owner.toString(),
        mint: account.account.data.slice(0, 32).toString(),
        amount: account.account.data.slice(64, 72).readBigUInt64LE().toString(),
      }));
    } catch (error) {
      throw new Error(`Failed to get token accounts: ${error.message}`);
    }
  }
}
