import { Injectable, BadRequestException } from "@nestjs/common";
import {
  Keypair,
  PublicKey,
  Transaction as SolanaTransaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Connection,
  Signer,
} from "@solana/web3.js";
import { sign } from "tweetnacl";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../transactions/transaction.entity";

export interface KeyPairResponse {
  publicKey: string;
  // Note: Private key is NEVER returned for security
}

export interface SigningResult {
  signature: string;
  publicKey: string;
  success: boolean;
}

export interface VerificationResult {
  isValid: boolean;
  publicKey: string;
  message: string;
}

export enum HardwareWalletType {
  LEDGER = "ledger",
  TREZOR = "trezor",
}

export interface HardwareWalletConfig {
  type: HardwareWalletType;
  derivationPath?: string; // e.g., "44'/501'/0'/0'" for Solana
  transport?: any; // Transport instance for Ledger
}

export interface HardwareWalletSignature {
  signature: string;
  publicKey: string;
  success: boolean;
  deviceInfo?: {
    type: HardwareWalletType;
    version?: string;
  };
}

export interface OfflineSigningRequest {
  id: string;
  transactionData: string; // Serialized transaction in base64
  message?: string; // Optional message to sign
  publicKey: string; // Expected signer public key
  createdAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'signed' | 'expired' | 'cancelled';
}

export interface OfflineSignature {
  requestId: string;
  signature: string;
  publicKey: string;
  signedAt: Date;
}

export interface MultiSigConfig {
  threshold: number; // Number of signatures required
  signers: string[]; // Array of public keys that can sign
  name?: string; // Optional name for the multi-sig
}

export interface MultiSigTransaction {
  id: string;
  multiSigAddress: string;
  transaction: SolanaTransaction;
  requiredSignatures: number;
  collectedSignatures: Array<{
    signer: string;
    signature: string;
    timestamp: Date;
  }>;
  status: 'pending' | 'ready' | 'executed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
}

@Injectable()
/**
 * Service for managing signing and cryptography.
 * @see docs/diagrams/07-signing-cryptography.md
 */
export class SigningService {
  private connection: Connection;

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );
  }

  /**
   * Parse derivation path string to array format for hardware wallets
   * @param path Derivation path like "44'/501'/0'/0'"
   * @returns Array of numbers like [44, 501, 0, 0]
   */
  private parseDerivationPath(path: string): number[] {
    return path
      .split('/')
      .map(part => parseInt(part.replace("'", ""), 10))
      .filter(num => !isNaN(num));
  }

  /**
   * Generate a new Ed25519 keypair for signing operations
   * Security: Private key is never exposed, only public key is returned
   */
  generateKeyPair(): KeyPairResponse {
    try {
      const keypair = Keypair.generate();

      return {
        publicKey: keypair.publicKey.toString(),
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate keypair: ${error.message}`,
      );
    }
  }

  /**
   * Sign a message using Ed25519
   * @param privateKey - Base58 encoded private key (NEVER store this)
   * @param message - Message to sign as Uint8Array
   */
  signMessage(privateKey: string, message: Uint8Array): SigningResult {
    try {
      // Convert private key from base58 to Uint8Array
      const keypair = this.loadKeyPairFromPrivateKey(privateKey);

      // Sign the message
      const signature = sign.detached(message, keypair.secretKey);

      return {
        signature: Buffer.from(signature).toString("base64"),
        publicKey: keypair.publicKey.toString(),
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to sign message: ${error.message}`);
    }
  }

  /**
   * Verify a signature against a message and public key
   */
  verifySignature(
    signature: string,
    message: Uint8Array,
    publicKey: string,
  ): VerificationResult {
    try {
      const pubKey = new PublicKey(publicKey);
      const sigBytes = Buffer.from(signature, "base64");

      const isValid = sign.detached.verify(message, sigBytes, pubKey.toBytes());

      return {
        isValid,
        publicKey,
        message: isValid
          ? "Signature is valid"
          : "Signature verification failed",
      };
    } catch (error) {
      return {
        isValid: false,
        publicKey,
        message: `Verification error: ${error.message}`,
      };
    }
  }

  /**
   * Sign and send a Solana transaction
   * @param privateKey - Base58 encoded private key
   * @param transaction - Partially built transaction
   */
  async signAndSendTransaction(
    privateKey: string,
    transaction: SolanaTransaction,
  ): Promise<SigningResult> {
    try {
      const keypair = this.loadKeyPairFromPrivateKey(privateKey);

      // Sign the transaction
      transaction.sign(keypair);

      // Send and confirm the transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
      );

      // Record the transaction in our database
      await this.transactionsRepository.save({
        signature,
        type: TransactionType.PROGRAM_INTERACTION,
        status: TransactionStatus.CONFIRMED,
        fromAddress: keypair.publicKey.toString(),
        amount: 0, // Would need to calculate from transaction
      });

      return {
        signature,
        publicKey: keypair.publicKey.toString(),
        success: true,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to sign and send transaction: ${error.message}`,
      );
    }
  }

  /**
   * Create and sign a simple transfer transaction
   */
  async createAndSignTransfer(
    privateKey: string,
    toAddress: string,
    amount: number,
  ): Promise<SigningResult> {
    try {
      const keypair = this.loadKeyPairFromPrivateKey(privateKey);
      const toPublicKey = new PublicKey(toAddress);

      const transaction = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: toPublicKey,
          lamports: amount,
        }),
      );

      return this.signAndSendTransaction(privateKey, transaction);
    } catch (error) {
      throw new BadRequestException(
        `Failed to create and sign transfer: ${error.message}`,
      );
    }
  }

  /**
   * Get public key from private key (for validation)
   */
  getPublicKeyFromPrivateKey(privateKey: string): string {
    try {
      const keypair = this.loadKeyPairFromPrivateKey(privateKey);
      return keypair.publicKey.toString();
    } catch (error) {
      throw new BadRequestException(`Invalid private key: ${error.message}`);
    }
  }

  /**
   * Get public key from hardware wallet
   */
  async getHardwareWalletPublicKey(
    config: HardwareWalletConfig,
  ): Promise<string> {
    try {
      switch (config.type) {
        case HardwareWalletType.LEDGER:
          return await this.getLedgerPublicKey(config);
        case HardwareWalletType.TREZOR:
          return await this.getTrezorPublicKey(config);
        default:
          throw new BadRequestException(`Unsupported hardware wallet type: ${config.type}`);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to get hardware wallet public key: ${error.message}`,
      );
    }
  }

  /**
   * Sign transaction with hardware wallet
   */
  async signTransactionWithHardwareWallet(
    transaction: SolanaTransaction,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    try {
      switch (config.type) {
        case HardwareWalletType.LEDGER:
          return await this.signTransactionWithLedger(transaction, config);
        case HardwareWalletType.TREZOR:
          return await this.signTransactionWithTrezor(transaction, config);
        default:
          throw new BadRequestException(`Unsupported hardware wallet type: ${config.type}`);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to sign transaction with hardware wallet: ${error.message}`,
      );
    }
  }

  /**
   * Sign message with hardware wallet
   */
  async signMessageWithHardwareWallet(
    message: Uint8Array,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    try {
      switch (config.type) {
        case HardwareWalletType.LEDGER:
          return await this.signMessageWithLedger(message, config);
        case HardwareWalletType.TREZOR:
          return await this.signMessageWithTrezor(message, config);
        default:
          throw new BadRequestException(`Unsupported hardware wallet type: ${config.type}`);
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to sign message with hardware wallet: ${error.message}`,
      );
    }
  }

  /**
   * Create an offline signing request
   * @param transaction Serialized transaction data
   * @param publicKey Expected signer public key
   * @param expiresIn Expiration time in milliseconds (optional)
   * @returns Offline signing request
   */
  createOfflineSigningRequest(
    transaction: SolanaTransaction,
    publicKey: string,
    expiresIn?: number,
  ): OfflineSigningRequest {
    try {
      const requestId = `offline-${Date.now()}-${Math.random()}`;
      const transactionData = transaction.serializeMessage().toString('base64');

      const request: OfflineSigningRequest = {
        id: requestId,
        transactionData,
        publicKey,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
        status: 'pending',
      };

      this.offlineRequests.set(requestId, request);
      return request;
    } catch (error) {
      throw new BadRequestException(`Failed to create offline signing request: ${error.message}`);
    }
  }

  /**
   * Create an offline message signing request
   * @param message Message to sign
   * @param publicKey Expected signer public key
   * @param expiresIn Expiration time in milliseconds (optional)
   * @returns Offline signing request
   */
  createOfflineMessageSigningRequest(
    message: Uint8Array,
    publicKey: string,
    expiresIn?: number,
  ): OfflineSigningRequest {
    try {
      const requestId = `offline-msg-${Date.now()}-${Math.random()}`;
      const messageData = Buffer.from(message).toString('base64');

      const request: OfflineSigningRequest = {
        id: requestId,
        transactionData: '', // Not used for message signing
        message: messageData,
        publicKey,
        createdAt: new Date(),
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined,
        status: 'pending',
      };

      this.offlineRequests.set(requestId, request);
      return request;
    } catch (error) {
      throw new BadRequestException(`Failed to create offline message signing request: ${error.message}`);
    }
  }

  /**
   * Sign an offline request
   * @param requestId Offline request ID
   * @param privateKey Private key to sign with
   * @returns Signature result
   */
  signOfflineRequest(requestId: string, privateKey: string): OfflineSignature {
    try {
      const request = this.offlineRequests.get(requestId);
      if (!request) {
        throw new BadRequestException('Offline signing request not found');
      }

      if (request.status !== 'pending') {
        throw new BadRequestException(`Request is not in pending state: ${request.status}`);
      }

      // Check expiration
      if (request.expiresAt && request.expiresAt < new Date()) {
        request.status = 'expired';
        this.offlineRequests.set(requestId, request);
        throw new BadRequestException('Offline signing request has expired');
      }

      const keypair = this.loadKeyPairFromPrivateKey(privateKey);

      // Verify the public key matches
      if (keypair.publicKey.toString() !== request.publicKey) {
        throw new BadRequestException('Private key does not match the expected public key');
      }

      let signature: string;

      if (request.message) {
        // Sign message
        const messageBytes = Buffer.from(request.message, 'base64');
        const signatureBytes = sign.detached(messageBytes, keypair.secretKey);
        signature = Buffer.from(signatureBytes).toString('base64');
      } else {
        // Sign transaction
        const transactionBuffer = Buffer.from(request.transactionData, 'base64');
        const tx = SolanaTransaction.from(transactionBuffer);
        tx.sign(keypair);
        signature = tx.signature?.toString('base64') || '';
      }

      // Update request status
      request.status = 'signed';
      this.offlineRequests.set(requestId, request);

      return {
        requestId,
        signature,
        publicKey: request.publicKey,
        signedAt: new Date(),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to sign offline request: ${error.message}`);
    }
  }

  /**
   * Get offline signing request status
   * @param requestId Request ID
   * @returns Request details
   */
  getOfflineSigningRequest(requestId: string): OfflineSigningRequest {
    const request = this.offlineRequests.get(requestId);
    if (!request) {
      throw new BadRequestException('Offline signing request not found');
    }
    return request;
  }

  /**
   * Cancel an offline signing request
   * @param requestId Request ID
   */
  cancelOfflineSigningRequest(requestId: string): void {
    const request = this.offlineRequests.get(requestId);
    if (!request) {
      throw new BadRequestException('Offline signing request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException(`Cannot cancel request with status: ${request.status}`);
    }

    request.status = 'cancelled';
    this.offlineRequests.set(requestId, request);
  }

  /**
   * Get all offline signing requests
   * @returns Array of requests
   */
  getAllOfflineSigningRequests(): OfflineSigningRequest[] {
    return Array.from(this.offlineRequests.values());
  }

  /**
   * Get Ledger public key
   */
  private async getLedgerPublicKey(config: HardwareWalletConfig): Promise<string> {
    try {
      // Dynamic import to avoid issues if library is not installed
      const { default: Solana } = await import("@ledgerhq/hw-app-solana");
      const { default: TransportWebUSB } = await import("@ledgerhq/hw-transport-webusb");

      const transport = config.transport || await TransportWebUSB.create();
      const solana = new Solana(transport);

      // Use derivation path as string
      const derivationPath = config.derivationPath || "44'/501'/0'/0'";

      const result = await solana.getAddress(derivationPath);
      // Convert Buffer to base58 string for Solana address
      const bs58 = await import("bs58");
      return bs58.default.encode(result.address);
    } catch (error) {
      throw new Error(`Ledger public key retrieval failed: ${error.message}`);
    }
  }

  /**
   * Sign transaction with Ledger
   */
  private async signTransactionWithLedger(
    transaction: SolanaTransaction,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    try {
      const { default: Solana } = await import("@ledgerhq/hw-app-solana");
      const { default: TransportWebUSB } = await import("@ledgerhq/hw-transport-webusb");

      const transport = config.transport || await TransportWebUSB.create();
      const solana = new Solana(transport);

      // Use derivation path as string
      const derivationPath = config.derivationPath || "44'/501'/0'/0'";

      // Serialize transaction for signing
      const serializedTx = transaction.serializeMessage();

      const result = await solana.signTransaction(derivationPath, serializedTx);

      // Get the public key as well
      const addressResult = await solana.getAddress(derivationPath);
      const bs58 = await import("bs58");
      const publicKey = bs58.default.encode(addressResult.address);

      return {
        signature: Buffer.from(result.signature).toString("base64"),
        publicKey,
        success: true,
        deviceInfo: {
          type: HardwareWalletType.LEDGER,
          version: "1.0.0", // Would get from device
        },
      };
    } catch (error) {
      throw new Error(`Ledger transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Sign message with Ledger
   */
  private async signMessageWithLedger(
    message: Uint8Array,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    try {
      const { default: Solana } = await import("@ledgerhq/hw-app-solana");
      const { default: TransportWebUSB } = await import("@ledgerhq/hw-transport-webusb");

      const transport = config.transport || await TransportWebUSB.create();
      const solana = new Solana(transport);

      // Use derivation path as string
      const derivationPath = config.derivationPath || "44'/501'/0'/0'";

      const result = await solana.signOffchainMessage(derivationPath, Buffer.from(message));

      // Get the public key
      const addressResult = await solana.getAddress(derivationPath);
      const bs58 = await import("bs58");
      const publicKey = bs58.default.encode(addressResult.address);

      return {
        signature: Buffer.from(result.signature).toString("base64"),
        publicKey,
        success: true,
        deviceInfo: {
          type: HardwareWalletType.LEDGER,
          version: "1.0.0",
        },
      };
    } catch (error) {
      throw new Error(`Ledger message signing failed: ${error.message}`);
    }
  }

  /**
   * Get Trezor public key
   */
  private async getTrezorPublicKey(config: HardwareWalletConfig): Promise<string> {
    try {
      // Temporarily disabled - need to install @trezor/connect
      throw new Error("Trezor integration not yet configured - missing @trezor/connect dependency");

      // const TrezorConnect = await import("@trezor/connect");
      // const derivationPath = config.derivationPath || "m/44'/501'/0'/0'";
      // const result = await TrezorConnect.solanaGetAddress({
      //   path: derivationPath,
      // });
      // if (!result.success) {
      //   throw new Error(result.payload.error);
      // }
      // return result.payload.address;
    } catch (error) {
      throw new Error(`Trezor public key retrieval failed: ${error.message}`);
    }
  }

  /**
   * Sign transaction with Trezor
   */
  private async signTransactionWithTrezor(
    transaction: SolanaTransaction,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    try {
      // Temporarily disabled - need to install @trezor/connect
      throw new Error("Trezor integration not yet configured - missing @trezor/connect dependency");
    } catch (error) {
      throw new Error(`Trezor transaction signing failed: ${error.message}`);
    }
  }

  /**
   * Sign message with Trezor
   */
  private async signMessageWithTrezor(
    message: Uint8Array,
    config: HardwareWalletConfig,
  ): Promise<HardwareWalletSignature> {
    // Note: Trezor Connect v9 does not support solanaSignMessage
    // Off-chain message signing is not available for Trezor Solana
    throw new Error("Trezor does not support off-chain message signing for Solana");
  }

  /**
   * Create a multi-signature account
   * @param config Multi-signature configuration
   * @returns Multi-signature account address
   */
  async createMultiSigAccount(config: MultiSigConfig): Promise<string> {
    try {
      if (config.signers.length < config.threshold) {
        throw new BadRequestException('Threshold cannot be greater than number of signers');
      }
      if (config.threshold < 1) {
        throw new BadRequestException('Threshold must be at least 1');
      }
      if (config.signers.length > 11) {
        throw new BadRequestException('Maximum 11 signers allowed');
      }

      // Create a program-derived address for the multi-sig account
      const seed = `multisig-${Date.now()}-${Math.random()}`;
      const [multiSigAddress] = await PublicKey.findProgramAddress(
        [Buffer.from(seed)],
        new PublicKey('11111111111111111111111111111112') // System program for demo
      );

      // In a real implementation, this would create an on-chain multi-sig account
      // For now, we'll store the configuration in memory
      this.multiSigAccounts.set(multiSigAddress.toString(), {
        address: multiSigAddress.toString(),
        config,
        createdAt: new Date(),
      });

      return multiSigAddress.toString();
    } catch (error) {
      throw new BadRequestException(`Failed to create multi-sig account: ${error.message}`);
    }
  }

  /**
   * Create a multi-signature transaction
   * @param multiSigAddress Multi-signature account address
   * @param transaction The transaction to be signed
   * @returns Multi-signature transaction ID
   */
  async createMultiSigTransaction(
    multiSigAddress: string,
    transaction: SolanaTransaction,
  ): Promise<string> {
    try {
      const account = this.multiSigAccounts.get(multiSigAddress);
      if (!account) {
        throw new BadRequestException('Multi-signature account not found');
      }

      const txId = `ms-${Date.now()}-${Math.random()}`;
      const multiSigTx: MultiSigTransaction = {
        id: txId,
        multiSigAddress,
        transaction,
        requiredSignatures: account.config.threshold,
        collectedSignatures: [],
        status: 'pending',
        createdAt: new Date(),
      };

      this.multiSigTransactions.set(txId, multiSigTx);
      return txId;
    } catch (error) {
      throw new BadRequestException(`Failed to create multi-sig transaction: ${error.message}`);
    }
  }

  /**
   * Add a signature to a multi-signature transaction
   * @param txId Multi-signature transaction ID
   * @param signerPrivateKey Private key of the signer
   * @returns Updated transaction status
   */
  async signMultiSigTransaction(
    txId: string,
    signerPrivateKey: string,
  ): Promise<MultiSigTransaction> {
    try {
      const multiSigTx = this.multiSigTransactions.get(txId);
      if (!multiSigTx) {
        throw new BadRequestException('Multi-signature transaction not found');
      }

      if (multiSigTx.status !== 'pending') {
        throw new BadRequestException('Transaction is not in pending state');
      }

      const account = this.multiSigAccounts.get(multiSigTx.multiSigAddress);
      if (!account) {
        throw new BadRequestException('Multi-signature account not found');
      }

      const signerKeypair = this.loadKeyPairFromPrivateKey(signerPrivateKey);
      const signerPublicKey = signerKeypair.publicKey.toString();

      // Check if signer is authorized
      if (!account.config.signers.includes(signerPublicKey)) {
        throw new BadRequestException('Unauthorized signer');
      }

      // Check if already signed
      const alreadySigned = multiSigTx.collectedSignatures.some(
        sig => sig.signer === signerPublicKey
      );
      if (alreadySigned) {
        throw new BadRequestException('Signer has already signed this transaction');
      }

      // Sign the transaction
      multiSigTx.transaction.sign(signerKeypair);

      // Add signature to collected signatures
      multiSigTx.collectedSignatures.push({
        signer: signerPublicKey,
        signature: multiSigTx.transaction.signature?.toString('base64') || '',
        timestamp: new Date(),
      });

      // Check if we have enough signatures
      if (multiSigTx.collectedSignatures.length >= multiSigTx.requiredSignatures) {
        multiSigTx.status = 'ready';
      }

      this.multiSigTransactions.set(txId, multiSigTx);
      return multiSigTx;
    } catch (error) {
      throw new BadRequestException(`Failed to sign multi-sig transaction: ${error.message}`);
    }
  }

  /**
   * Execute a multi-signature transaction
   * @param txId Multi-signature transaction ID
   * @returns Transaction signature
   */
  async executeMultiSigTransaction(txId: string): Promise<string> {
    try {
      const multiSigTx = this.multiSigTransactions.get(txId);
      if (!multiSigTx) {
        throw new BadRequestException('Multi-signature transaction not found');
      }

      if (multiSigTx.status !== 'ready') {
        throw new BadRequestException('Transaction is not ready for execution');
      }

      // Send the transaction to the network
      const signature = await sendAndConfirmTransaction(
        this.connection,
        multiSigTx.transaction,
        [], // No additional signers needed since transaction is already signed
      );

      // Update transaction status
      multiSigTx.status = 'executed';
      multiSigTx.executedAt = new Date();
      this.multiSigTransactions.set(txId, multiSigTx);

      return signature;
    } catch (error) {
      const multiSigTx = this.multiSigTransactions.get(txId);
      if (multiSigTx) {
        multiSigTx.status = 'failed';
        this.multiSigTransactions.set(txId, multiSigTx);
      }
      throw new BadRequestException(`Failed to execute multi-sig transaction: ${error.message}`);
    }
  }

  /**
   * Get multi-signature transaction status
   * @param txId Multi-signature transaction ID
   * @returns Transaction details
   */
  getMultiSigTransaction(txId: string): MultiSigTransaction {
    const tx = this.multiSigTransactions.get(txId);
    if (!tx) {
      throw new BadRequestException('Multi-signature transaction not found');
    }
    return tx;
  }

  /**
   * Get all multi-signature accounts
   * @returns Array of multi-signature accounts
   */
  getMultiSigAccounts(): Array<{ address: string; config: MultiSigConfig; createdAt: Date }> {
    return Array.from(this.multiSigAccounts.values());
  }

  // In-memory storage for demo purposes - in production, use database
  private multiSigAccounts = new Map<string, { address: string; config: MultiSigConfig; createdAt: Date }>();
  private multiSigTransactions = new Map<string, MultiSigTransaction>();
  private offlineRequests = new Map<string, OfflineSigningRequest>();

  /**
   * Load keypair from private key string
   * Private method to centralize key loading logic
   */
  private loadKeyPairFromPrivateKey(privateKey: string): Keypair {
    try {
      // For now, assume private key is passed as JSON array of numbers
      // In production, this should be properly encrypted and managed
      const secretKey = new Uint8Array(JSON.parse(privateKey));
      return Keypair.fromSecretKey(secretKey);
    } catch (error) {
      throw new Error(`Invalid private key format: ${error.message}`);
    }
  }
}
