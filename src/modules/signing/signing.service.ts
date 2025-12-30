import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Keypair,
  PublicKey,
  Transaction as SolanaTransaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Connection,
  Signer,
} from '@solana/web3.js';
import { sign } from 'tweetnacl';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction, TransactionStatus, TransactionType } from '../transactions/transaction.entity';

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
    this.connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
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
      throw new BadRequestException(`Failed to generate keypair: ${error.message}`);
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
        signature: Buffer.from(signature).toString('base64'),
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
      const sigBytes = Buffer.from(signature, 'base64');

      const isValid = sign.detached.verify(message, sigBytes, pubKey.toBytes());

      return {
        isValid,
        publicKey,
        message: isValid ? 'Signature is valid' : 'Signature verification failed',
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
      throw new BadRequestException(`Failed to sign and send transaction: ${error.message}`);
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
      throw new BadRequestException(`Failed to create and sign transfer: ${error.message}`);
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