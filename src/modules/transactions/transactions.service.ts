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
}
