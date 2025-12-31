import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Token } from "./token.entity";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAccount,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  burn,
  getOrCreateAssociatedTokenAccount,
  closeAccount,
  freezeAccount,
  thawAccount,
  approve,
  revoke,
  createTransferInstruction,
} from "@solana/spl-token";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  Connection,
} from "@solana/web3.js";

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

  /**
   * Create a new token mint
   */
  async createTokenMint(
    payerPrivateKey: string,
    decimals: number = 9,
    freezeAuthority?: string,
  ): Promise<{ mintAddress: string; signature: string }> {
    try {
      const payerKeypair = Keypair.fromSecretKey(
        Buffer.from(payerPrivateKey, 'base64')
      );

      const freezeAuthorityPubkey = freezeAuthority
        ? new PublicKey(freezeAuthority)
        : null;

      const mint = await createMint(
        this.connection,
        payerKeypair,
        payerKeypair.publicKey,
        freezeAuthorityPubkey,
        decimals,
      );

      return {
        mintAddress: mint.toString(),
        signature: 'Token mint created successfully',
      };
    } catch (error) {
      throw new Error(`Failed to create token mint: ${error.message}`);
    }
  }

  /**
   * Create NFT with metadata
   */
  async createNFTWithMetadata(
    payerPrivateKey: string,
    name: string,
    symbol: string,
    uri: string,
    sellerFeeBasisPoints: number = 500, // 5%
  ): Promise<{ mintAddress: string; metadataAddress: string; signature: string }> {
    try {
      const payerKeypair = Keypair.fromSecretKey(
        Buffer.from(payerPrivateKey, 'base64')
      );

      // Create NFT mint (supply = 1, decimals = 0)
      const mint = await createMint(
        this.connection,
        payerKeypair,
        payerKeypair.publicKey,
        payerKeypair.publicKey, // freeze authority
        0, // decimals = 0 for NFT
      );

      // Create associated token account for the NFT
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair,
        mint,
        payerKeypair.publicKey,
      );

      // Mint 1 NFT to the creator
      await mintTo(
        this.connection,
        payerKeypair,
        mint,
        tokenAccount.address,
        payerKeypair.publicKey,
        1, // amount = 1 for NFT
      );

      // Create metadata account (simplified - in production would use Metaplex SDK)
      const metadataAddress = await this.createMetadataAccount(
        payerKeypair,
        mint,
        name,
        symbol,
        uri,
        sellerFeeBasisPoints,
      );

      return {
        mintAddress: mint.toString(),
        metadataAddress: metadataAddress.toString(),
        signature: 'NFT created successfully',
      };
    } catch (error) {
      throw new Error(`Failed to create NFT: ${error.message}`);
    }
  }

  /**
   * Create metadata account for NFT (simplified implementation)
   */
  private async createMetadataAccount(
    payerKeypair: Keypair,
    mint: PublicKey,
    name: string,
    symbol: string,
    uri: string,
    sellerFeeBasisPoints: number,
  ): Promise<PublicKey> {
    // Metaplex Token Metadata Program ID
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

    // Derive metadata account address
    const [metadataAddress] = await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      METADATA_PROGRAM_ID,
    );

    // Create metadata instruction (simplified)
    const metadataData = {
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators: [{
        address: payerKeypair.publicKey.toString(),
        verified: true,
        share: 100,
      }],
    };

    // In a full implementation, this would create the proper Metaplex instruction
    // For now, we'll just return the derived address
    return metadataAddress;
  }

  /**
   * Mint tokens to an account
   */
  async mintTokens(
    payerPrivateKey: string,
    mintAddress: string,
    recipientAddress: string,
    amount: number,
  ): Promise<{ signature: string }> {
    try {
      const payerKeypair = Keypair.fromSecretKey(
        Buffer.from(payerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      // Get or create associated token account
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair,
        mintPublicKey,
        recipientPublicKey,
      );

      // Mint tokens
      const signature = await mintTo(
        this.connection,
        payerKeypair,
        mintPublicKey,
        tokenAccount.address,
        payerKeypair.publicKey,
        amount,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to mint tokens: ${error.message}`);
    }
  }

  /**
   * Burn tokens from an account
   */
  async burnTokens(
    ownerPrivateKey: string,
    mintAddress: string,
    amount: number,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Burn tokens
      const signature = await burn(
        this.connection,
        ownerKeypair,
        tokenAccount,
        mintPublicKey,
        ownerKeypair.publicKey,
        amount,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to burn tokens: ${error.message}`);
    }
  }

  /**
   * Get token supply information
   */
  async getTokenSupply(mintAddress: string): Promise<{
    supply: string;
    decimals: number;
    mintAuthority: string | null;
    freezeAuthority: string | null;
  }> {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const mintInfo = await this.connection.getAccountInfo(mintPublicKey);

      if (!mintInfo) {
        throw new Error("Token mint not found");
      }

      const data = mintInfo.data;

      return {
        supply: data.slice(36, 44).readBigUInt64LE().toString(),
        decimals: data[44],
        mintAuthority: data[4] === 1 ? new PublicKey(data.slice(4, 36)).toString() : null,
        freezeAuthority: data[44 + 1] === 1 ? new PublicKey(data.slice(44 + 1, 44 + 33)).toString() : null,
      };
    } catch (error) {
      throw new Error(`Failed to get token supply: ${error.message}`);
    }
  }

  /**
   * Get or create associated token account (ATA)
   */
  async getOrCreateATA(
    payerPrivateKey: string,
    mintAddress: string,
    ownerAddress: string,
  ): Promise<{ ataAddress: string; created: boolean; signature?: string }> {
    try {
      const payerKeypair = Keypair.fromSecretKey(
        Buffer.from(payerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const ownerPublicKey = new PublicKey(ownerAddress);

      // Check if ATA already exists
      const ataAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerPublicKey,
      );

      let created = false;
      try {
        await getAccount(this.connection, ataAddress);
        // ATA exists
      } catch (error) {
        // ATA doesn't exist, will be created
        created = true;
      }

      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        payerKeypair,
        mintPublicKey,
        ownerPublicKey,
      );

      return {
        ataAddress: tokenAccount.address.toString(),
        created,
        signature: created ? 'ATA created successfully' : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get or create ATA: ${error.message}`);
    }
  }

  /**
   * Get associated token account address
   */
  async getATA(mintAddress: string, ownerAddress: string): Promise<string> {
    try {
      const mintPublicKey = new PublicKey(mintAddress);
      const ownerPublicKey = new PublicKey(ownerAddress);

      const ataAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerPublicKey,
      );

      return ataAddress.toString();
    } catch (error) {
      throw new Error(`Failed to get ATA address: ${error.message}`);
    }
  }

  /**
   * Close token account
   */
  async closeTokenAccount(
    ownerPrivateKey: string,
    mintAddress: string,
    recipientAddress?: string,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const recipientPublicKey = recipientAddress
        ? new PublicKey(recipientAddress)
        : ownerKeypair.publicKey;

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Close the token account
      const signature = await closeAccount(
        this.connection,
        ownerKeypair,
        tokenAccount,
        recipientPublicKey,
        ownerKeypair.publicKey,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to close token account: ${error.message}`);
    }
  }

  /**
   * Freeze token account
   */
  async freezeTokenAccount(
    freezeAuthorityPrivateKey: string,
    mintAddress: string,
    accountAddress: string,
  ): Promise<{ signature: string }> {
    try {
      const freezeAuthorityKeypair = Keypair.fromSecretKey(
        Buffer.from(freezeAuthorityPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const accountPublicKey = new PublicKey(accountAddress);

      // Freeze the token account
      const signature = await freezeAccount(
        this.connection,
        freezeAuthorityKeypair,
        accountPublicKey,
        mintPublicKey,
        freezeAuthorityKeypair.publicKey,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to freeze token account: ${error.message}`);
    }
  }

  /**
   * Thaw token account
   */
  async thawTokenAccount(
    freezeAuthorityPrivateKey: string,
    mintAddress: string,
    accountAddress: string,
  ): Promise<{ signature: string }> {
    try {
      const freezeAuthorityKeypair = Keypair.fromSecretKey(
        Buffer.from(freezeAuthorityPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const accountPublicKey = new PublicKey(accountAddress);

      // Thaw the token account
      const signature = await thawAccount(
        this.connection,
        freezeAuthorityKeypair,
        accountPublicKey,
        mintPublicKey,
        freezeAuthorityKeypair.publicKey,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to thaw token account: ${error.message}`);
    }
  }

  /**
   * Delegate token account authority
   */
  async delegateTokenAccount(
    ownerPrivateKey: string,
    mintAddress: string,
    delegateAddress: string,
    amount: number,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const delegatePublicKey = new PublicKey(delegateAddress);

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Approve delegation
      const signature = await approve(
        this.connection,
        ownerKeypair,
        tokenAccount,
        delegatePublicKey,
        ownerKeypair.publicKey,
        amount,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to delegate token account: ${error.message}`);
    }
  }

  /**
   * Revoke token account delegation
   */
  async revokeTokenDelegation(
    ownerPrivateKey: string,
    mintAddress: string,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Revoke delegation
      const signature = await revoke(
        this.connection,
        ownerKeypair,
        tokenAccount,
        ownerKeypair.publicKey,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to revoke token delegation: ${error.message}`);
    }
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    ownerPrivateKey: string,
    mintAddress: string,
    recipientAddress: string,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const recipientPublicKey = new PublicKey(recipientAddress);

      // Get associated token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        ownerKeypair,
        mintPublicKey,
        recipientPublicKey,
      );

      // Transfer 1 NFT (since NFTs have supply of 1)
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount.address,
        ownerKeypair.publicKey,
        1,
        [],
        TOKEN_PROGRAM_ID,
      );

      const transaction = new Transaction().add(transferInstruction);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [ownerKeypair],
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to transfer NFT: ${error.message}`);
    }
  }

  /**
   * Approve token spending (delegate authority)
   */
  async approveTokenSpending(
    ownerPrivateKey: string,
    mintAddress: string,
    spenderAddress: string,
    amount: number,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);
      const spenderPublicKey = new PublicKey(spenderAddress);

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Approve spending
      const signature = await approve(
        this.connection,
        ownerKeypair,
        tokenAccount,
        spenderPublicKey,
        ownerKeypair.publicKey,
        amount,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to approve token spending: ${error.message}`);
    }
  }

  /**
   * Revoke token spending approval
   */
  async revokeTokenApproval(
    ownerPrivateKey: string,
    mintAddress: string,
  ): Promise<{ signature: string }> {
    try {
      const ownerKeypair = Keypair.fromSecretKey(
        Buffer.from(ownerPrivateKey, 'base64')
      );

      const mintPublicKey = new PublicKey(mintAddress);

      // Get associated token account
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerKeypair.publicKey,
      );

      // Revoke approval
      const signature = await revoke(
        this.connection,
        ownerKeypair,
        tokenAccount,
        ownerKeypair.publicKey,
      );

      return { signature };
    } catch (error) {
      throw new Error(`Failed to revoke token approval: ${error.message}`);
    }
  }

  /**
   * Verify NFT ownership
   */
  async verifyNFTOwnership(
    ownerAddress: string,
    mintAddress: string,
  ): Promise<{ isOwner: boolean; balance: string; isNFT: boolean }> {
    try {
      const ownerPublicKey = new PublicKey(ownerAddress);
      const mintPublicKey = new PublicKey(mintAddress);

      // Get mint info to check if it's an NFT (supply = 1, decimals = 0)
      const mintInfo = await this.connection.getAccountInfo(mintPublicKey);
      if (!mintInfo) {
        throw new Error("Token mint not found");
      }

      const supply = mintInfo.data.slice(36, 44).readBigUInt64LE();
      const decimals = mintInfo.data[44];
      const isNFT = supply === BigInt(1) && decimals === 0;

      // Get token balance
      const tokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        ownerPublicKey,
      );

      let balance = "0";
      try {
        const accountInfo = await getAccount(this.connection, tokenAccount);
        balance = accountInfo.amount.toString();
      } catch (error) {
        // Token account doesn't exist or has no balance
        balance = "0";
      }

      const isOwner = balance === "1";

      return {
        isOwner,
        balance,
        isNFT,
      };
    } catch (error) {
      throw new Error(`Failed to verify NFT ownership: ${error.message}`);
    }
  }
}
