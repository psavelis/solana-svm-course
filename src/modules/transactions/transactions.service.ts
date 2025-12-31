import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "./transaction.entity";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction as SolanaTransaction,
  sendAndConfirmTransaction,
  Keypair,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { MessagePublisherService } from "./message-publisher.service";

@Injectable()
/**
 * Service for managing Solana transactions.
 * @see docs/diagrams/02-transactions-instructions.md
 */
export class TransactionsService {
  private connection: Connection;

  constructor(
    @InjectRepository(Transaction)
    private transactionsRepository: Repository<Transaction>,
    private messagePublisher: MessagePublisherService,
  ) {
    this.connection = new Connection(
      process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
    );
  }

  async create(transactionData: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactionsRepository.create(transactionData);
    const savedTransaction =
      await this.transactionsRepository.save(transaction);

    // Publish transaction created event
    await this.messagePublisher.publishTransactionCreated(savedTransaction);

    return savedTransaction;
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionsRepository.find({ order: { createdAt: "DESC" } });
  }

  async findOne(id: string): Promise<Transaction> {
    return this.transactionsRepository.findOne({ where: { id } });
  }

  async findBySignature(signature: string): Promise<Transaction> {
    return this.transactionsRepository.findOne({ where: { signature } });
  }

  async update(
    id: string,
    updateData: Partial<Transaction>,
  ): Promise<Transaction> {
    const existingTransaction = await this.findOne(id);
    const previousStatus = existingTransaction.status;

    await this.transactionsRepository.update(id, updateData);
    const updatedTransaction = await this.findOne(id);

    // Publish status update event if status changed
    if (updateData.status && updateData.status !== previousStatus) {
      await this.messagePublisher.publishTransactionStatusUpdated(
        updatedTransaction,
        previousStatus,
      );
    }

    return updatedTransaction;
  }

  async remove(id: string): Promise<void> {
    await this.transactionsRepository.delete(id);
  }

  async getTransaction(signature: string) {
    try {
      const transaction = await this.connection.getTransaction(signature);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      return {
        signature,
        slot: transaction.slot,
        blockTime: transaction.blockTime
          ? new Date(transaction.blockTime * 1000)
          : null,
        fee: transaction.meta?.fee,
        status: transaction.meta?.err ? "failed" : "confirmed",
        instructions: transaction.transaction.message.instructions.map(
          (inst, index) => ({
            programId:
              transaction.transaction.message.accountKeys[
                inst.programIdIndex
              ].toString(),
            accounts: inst.accounts.map((accIndex) =>
              transaction.transaction.message.accountKeys[accIndex].toString(),
            ),
            data: inst.data.toString(),
          }),
        ),
        logs: transaction.meta?.logMessages || [],
      };
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  async sendTransfer(
    fromPrivateKey: string,
    toAddress: string,
    amount: number,
  ): Promise<string> {
    let fromKeypair: Keypair;
    try {
      fromKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fromPrivateKey)),
      );
      const toPublicKey = new PublicKey(toAddress);

      const transaction = new SolanaTransaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports: amount,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
      );

      // Save to database
      const savedTransaction = await this.create({
        signature,
        type: TransactionType.TRANSFER,
        status: TransactionStatus.CONFIRMED,
        fromAddress: fromKeypair.publicKey.toString(),
        toAddress,
        amount,
      });

      // Publish confirmation event
      await this.messagePublisher.publishTransactionConfirmed(savedTransaction);

      return signature;
    } catch (error) {
      // Create failed transaction record
      const failedTransaction = await this.create({
        signature: "failed-" + Date.now(),
        type: TransactionType.TRANSFER,
        status: TransactionStatus.FAILED,
        fromAddress: fromKeypair ? fromKeypair.publicKey.toString() : "unknown",
        toAddress,
        amount,
        metadata: { error: error.message },
      });

      // Publish failure event
      await this.messagePublisher.publishTransactionFailed(
        failedTransaction,
        error.message,
      );

      throw new Error(`Failed to send transfer: ${error.message}`);
    }
  }

  /**
   * Send token transfer transaction
   */
  async sendTokenTransfer(
    fromPrivateKey: string,
    toAddress: string,
    mintAddress: string,
    amount: number,
  ): Promise<string> {
    let fromKeypair: Keypair;
    try {
      fromKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fromPrivateKey)),
      );

      const toPublicKey = new PublicKey(toAddress);
      const mintPublicKey = new PublicKey(mintAddress);

      // Get or create associated token accounts
      const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        fromKeypair.publicKey,
      );

      const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        fromKeypair,
        mintPublicKey,
        toPublicKey,
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        fromKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID,
      );

      const transaction = new SolanaTransaction().add(transferInstruction);

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [fromKeypair],
      );

      // Save to database
      const savedTransaction = await this.create({
        signature,
        type: TransactionType.TOKEN_TRANSFER,
        status: TransactionStatus.CONFIRMED,
        fromAddress: fromKeypair.publicKey.toString(),
        toAddress,
        amount,
        metadata: { mintAddress, tokenAmount: amount },
      });

      // Publish confirmation event
      await this.messagePublisher.publishTransactionConfirmed(savedTransaction);

      return signature;
    } catch (error) {
      // Create failed transaction record
      const failedTransaction = await this.create({
        signature: "failed-" + Date.now(),
        type: TransactionType.TOKEN_TRANSFER,
        status: TransactionStatus.FAILED,
        fromAddress: fromKeypair ? fromKeypair.publicKey.toString() : "unknown",
        toAddress,
        amount,
        metadata: { mintAddress, error: error.message },
      });

      // Publish failure event
      await this.messagePublisher.publishTransactionFailed(
        failedTransaction,
        error.message,
      );

      throw new Error(`Failed to send token transfer: ${error.message}`);
    }
  }

  /**
   * Create multi-instruction transaction
   */
  async createMultiInstructionTransaction(
    privateKey: string,
    instructions: Array<{
      programId: string;
      accounts: Array<{
        pubkey: string;
        isSigner: boolean;
        isWritable: boolean;
      }>;
      data: string; // base64 encoded
    }>,
  ): Promise<string> {
    try {
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(privateKey)),
      );

      const transaction = new SolanaTransaction();

      for (const instruction of instructions) {
        const programId = new PublicKey(instruction.programId);
        const accounts = instruction.accounts.map(acc => ({
          pubkey: new PublicKey(acc.pubkey),
          isSigner: acc.isSigner,
          isWritable: acc.isWritable,
        }));
        const data = Buffer.from(instruction.data, 'base64');

        transaction.add({
          keys: accounts,
          programId,
          data,
        });
      }

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
      );

      // Save to database
      const savedTransaction = await this.create({
        signature,
        type: TransactionType.PROGRAM_INTERACTION,
        status: TransactionStatus.CONFIRMED,
        metadata: { instructionCount: instructions.length },
      });

      // Publish confirmation event
      await this.messagePublisher.publishTransactionConfirmed(savedTransaction);

      return signature;
    } catch (error) {
      // Create failed transaction record
      const failedTransaction = await this.create({
        signature: "failed-" + Date.now(),
        type: TransactionType.PROGRAM_INTERACTION,
        status: TransactionStatus.FAILED,
        metadata: { error: error.message, instructionCount: instructions.length },
      });

      // Publish failure event
      await this.messagePublisher.publishTransactionFailed(
        failedTransaction,
        error.message,
      );

      throw new Error(`Failed to create multi-instruction transaction: ${error.message}`);
    }
  }

  /**
   * Create batched transaction (multiple operations in sequence)
   */
  async createBatchedTransaction(
    privateKey: string,
    operations: Array<{
      type: 'transfer' | 'token_transfer' | 'token_mint';
      params: any;
    }>,
  ): Promise<string> {
    try {
      const keypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(privateKey)),
      );

      const transaction = new SolanaTransaction();

      for (const operation of operations) {
        switch (operation.type) {
          case 'transfer':
            const transferInstruction = SystemProgram.transfer({
              fromPubkey: keypair.publicKey,
              toPubkey: new PublicKey(operation.params.toAddress),
              lamports: operation.params.amount,
            });
            transaction.add(transferInstruction);
            break;

          case 'token_transfer':
            // Add token transfer logic here
            const tokenTransferInstruction = await this.createTokenTransferInstruction(
              keypair,
              operation.params.mintAddress,
              operation.params.toAddress,
              operation.params.amount,
            );
            transaction.add(tokenTransferInstruction);
            break;

          case 'token_mint':
            // Add token minting logic here
            const mintInstruction = await this.createMintInstruction(
              keypair,
              operation.params.mintAddress,
              operation.params.recipientAddress,
              operation.params.amount,
            );
            transaction.add(mintInstruction);
            break;

          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }
      }

      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [keypair],
      );

      // Save to database
      const savedTransaction = await this.create({
        signature,
        type: TransactionType.TRANSFER, // Could be enhanced to track batch type
        status: TransactionStatus.CONFIRMED,
        metadata: { operationCount: operations.length, batch: true },
      });

      // Publish confirmation event
      await this.messagePublisher.publishTransactionConfirmed(savedTransaction);

      return signature;
    } catch (error) {
      // Create failed transaction record
      const failedTransaction = await this.create({
        signature: "failed-" + Date.now(),
        type: TransactionType.TRANSFER,
        status: TransactionStatus.FAILED,
        metadata: { error: error.message, operationCount: operations.length, batch: true },
      });

      // Publish failure event
      await this.messagePublisher.publishTransactionFailed(
        failedTransaction,
        error.message,
      );

      throw new Error(`Failed to create batched transaction: ${error.message}`);
    }
  }

  /**
   * Helper method to create token transfer instruction
   */
  private async createTokenTransferInstruction(
    keypair: Keypair,
    mintAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<any> {
    const mintPublicKey = new PublicKey(mintAddress);
    const toPublicKey = new PublicKey(toAddress);

    const fromTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      keypair.publicKey,
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      mintPublicKey,
      toPublicKey,
    );

    return createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      keypair.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID,
    );
  }

  /**
   * Helper method to create mint instruction
   */
  private async createMintInstruction(
    keypair: Keypair,
    mintAddress: string,
    recipientAddress: string,
    amount: number,
  ): Promise<any> {
    // This would need proper implementation for minting in a batch
    // For now, return a placeholder
    throw new Error('Mint operations in batches not yet implemented');
  }

  async getRecentTransactions(limit: number = 10) {
    try {
      const confirmedSignatures =
        await this.connection.getConfirmedSignaturesForAddress2(
          new PublicKey("11111111111111111111111111111112"), // System Program
          { limit },
        );

      return confirmedSignatures.map((sig) => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime ? new Date(sig.blockTime * 1000) : null,
        err: sig.err,
      }));
    } catch (error) {
      throw new Error(`Failed to get recent transactions: ${error.message}`);
    }
  }

  async getFeeEstimate(): Promise<{ baseFee: number; priorityFee: number }> {
    try {
      const { feeCalculator } = await this.connection.getRecentBlockhash();
      return {
        baseFee: feeCalculator.lamportsPerSignature,
        priorityFee: 0, // Simplified, would need more complex calculation
      };
    } catch (error) {
      throw new Error(`Failed to get fee estimate: ${error.message}`);
    }
  }

  /**
   * Update transaction status based on blockchain confirmation
   */
  async updateTransactionStatus(signature: string): Promise<Transaction> {
    try {
      const transaction = await this.findBySignature(signature);
      if (!transaction) {
        throw new Error("Transaction not found in database");
      }

      // Check confirmation status on blockchain
      const confirmation = await this.connection.getSignatureStatus(signature);

      if (!confirmation || !confirmation.value) {
        // Transaction not found or still pending
        return transaction;
      }

      const blockchainStatus = confirmation.value;
      let newStatus: TransactionStatus;

      if (blockchainStatus.err) {
        newStatus = TransactionStatus.FAILED;
      } else if (blockchainStatus.confirmationStatus === 'confirmed' || blockchainStatus.confirmationStatus === 'finalized') {
        newStatus = TransactionStatus.CONFIRMED;
      } else {
        newStatus = TransactionStatus.PENDING;
      }

      // Update if status changed
      if (newStatus !== transaction.status) {
        const updatedTransaction = await this.update(transaction.id, {
          status: newStatus,
          // Note: Fee information would need to be retrieved separately from getTransaction
        });

        // Publish appropriate event
        if (newStatus === TransactionStatus.CONFIRMED) {
          await this.messagePublisher.publishTransactionConfirmed(updatedTransaction);
        } else if (newStatus === TransactionStatus.FAILED) {
          await this.messagePublisher.publishTransactionFailed(updatedTransaction, 'Blockchain confirmation failed');
        }

        return updatedTransaction;
      }

      return transaction;
    } catch (error) {
      throw new Error(`Failed to update transaction status: ${error.message}`);
    }
  }

  /**
   * Get transaction history for an address
   */
  async getTransactionHistory(
    address: string,
    limit: number = 20,
  ): Promise<Transaction[]> {
    try {
      const publicKey = new PublicKey(address);

      // Get confirmed signatures for the address
      const signatures = await this.connection.getConfirmedSignaturesForAddress2(
        publicKey,
        { limit },
      );

      // Get transaction details and update database
      const transactions: Transaction[] = [];

      for (const sig of signatures) {
        let transaction = await this.findBySignature(sig.signature);

        if (!transaction) {
          // Create transaction record if it doesn't exist
          const txDetails = await this.connection.getTransaction(sig.signature);
          if (txDetails) {
            transaction = await this.create({
              signature: sig.signature,
              type: TransactionType.TRANSFER, // Default type, could be enhanced
              status: sig.err ? TransactionStatus.FAILED : TransactionStatus.CONFIRMED,
              fee: txDetails.meta?.fee || 0,
            });
          }
        } else {
          // Update status if needed
          transaction = await this.updateTransactionStatus(sig.signature);
        }

        if (transaction) {
          transactions.push(transaction);
        }
      }

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }
}
