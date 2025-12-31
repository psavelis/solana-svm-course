import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { MessagePublisherService } from "./message-publisher.service";
import { Transaction } from "./transaction.entity";

@ApiTags("transactions")
@Controller("transactions")
/**
 * Controller for managing Solana transactions.
 * @see docs/diagrams/02-transactions-instructions.md
 */
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly messagePublisher: MessagePublisherService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create a new transaction record" })
  @ApiResponse({
    status: 201,
    description: "Transaction created successfully",
    type: Transaction,
  })
  create(@Body() createTransactionDto: Partial<Transaction>) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all transactions" })
  @ApiResponse({
    status: 200,
    description: "List of transactions",
    type: [Transaction],
  })
  findAll() {
    return this.transactionsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get transaction by ID" })
  @ApiResponse({
    status: 200,
    description: "Transaction details",
    type: Transaction,
  })
  findOne(@Param("id") id: string) {
    return this.transactionsService.findOne(id);
  }

  @Get("signature/:signature")
  @ApiOperation({ summary: "Get transaction by signature" })
  @ApiResponse({
    status: 200,
    description: "Transaction details",
    type: Transaction,
  })
  findBySignature(@Param("signature") signature: string) {
    return this.transactionsService.findBySignature(signature);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update transaction" })
  @ApiResponse({
    status: 200,
    description: "Transaction updated successfully",
    type: Transaction,
  })
  update(
    @Param("id") id: string,
    @Body() updateTransactionDto: Partial<Transaction>,
  ) {
    return this.transactionsService.update(id, updateTransactionDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete transaction" })
  @ApiResponse({ status: 200, description: "Transaction deleted successfully" })
  remove(@Param("id") id: string) {
    return this.transactionsService.remove(id);
  }

  @Get("details/:signature")
  @ApiOperation({ summary: "Get transaction details from Solana" })
  @ApiResponse({ status: 200, description: "Transaction details from Solana" })
  getTransaction(@Param("signature") signature: string) {
    return this.transactionsService.getTransaction(signature);
  }

  @Post("transfer")
  @ApiOperation({ summary: "Send SOL transfer transaction" })
  @ApiResponse({
    status: 201,
    description: "Transfer transaction sent successfully",
  })
  sendTransfer(
    @Body()
    transferDto: {
      fromPrivateKey: string;
      toAddress: string;
      amount: number;
    },
  ) {
    return this.transactionsService.sendTransfer(
      transferDto.fromPrivateKey,
      transferDto.toAddress,
      transferDto.amount,
    );
  }

  @Post("token-transfer")
  @ApiOperation({ summary: "Send token transfer transaction" })
  @ApiResponse({
    status: 201,
    description: "Token transfer transaction sent successfully",
  })
  sendTokenTransfer(
    @Body()
    transferDto: {
      fromPrivateKey: string;
      toAddress: string;
      mintAddress: string;
      amount: number;
    },
  ) {
    return this.transactionsService.sendTokenTransfer(
      transferDto.fromPrivateKey,
      transferDto.toAddress,
      transferDto.mintAddress,
      transferDto.amount,
    );
  }

  @Post("multi-instruction")
  @ApiOperation({ summary: "Create multi-instruction transaction" })
  @ApiResponse({
    status: 201,
    description: "Multi-instruction transaction created successfully",
  })
  createMultiInstructionTransaction(
    @Body()
    transactionDto: {
      privateKey: string;
      instructions: Array<{
        programId: string;
        accounts: Array<{
          pubkey: string;
          isSigner: boolean;
          isWritable: boolean;
        }>;
        data: string;
      }>;
    },
  ) {
    return this.transactionsService.createMultiInstructionTransaction(
      transactionDto.privateKey,
      transactionDto.instructions,
    );
  }

  @Post("batch")
  @ApiOperation({ summary: "Create batched transaction with multiple operations" })
  @ApiResponse({
    status: 201,
    description: "Batched transaction created successfully",
  })
  createBatchedTransaction(
    @Body()
    transactionDto: {
      privateKey: string;
      operations: Array<{
        type: 'transfer' | 'token_transfer' | 'token_mint';
        params: any;
      }>;
    },
  ) {
    return this.transactionsService.createBatchedTransaction(
      transactionDto.privateKey,
      transactionDto.operations,
    );
  }

  @Get("recent/list")
  @ApiOperation({ summary: "Get recent transactions" })
  @ApiResponse({ status: 200, description: "List of recent transactions" })
  getRecentTransactions(@Query("limit") limit?: number) {
    return this.transactionsService.getRecentTransactions(limit);
  }

  @Get("fee/estimate")
  @ApiOperation({ summary: "Get fee estimate" })
  @ApiResponse({ status: 200, description: "Fee estimate" })
  getFeeEstimate() {
    return this.transactionsService.getFeeEstimate();
  }

  @Post("events/test")
  @ApiOperation({
    summary: "Create a test transaction to demonstrate event publishing",
  })
  @ApiResponse({
    status: 201,
    description: "Test transaction created and event published",
  })
  async createTestTransaction() {
    const testTransaction = {
      signature: `test-${Date.now()}`,
      type: "transfer" as any,
      status: "pending" as any,
      fromAddress: "11111111111111111111111111111112",
      toAddress: "11111111111111111111111111111113",
      amount: 1000000, // 0.001 SOL
      metadata: { test: true, createdAt: new Date() },
    };

    return this.transactionsService.create(testTransaction);
  }

  @Post(":id/events/status-update")
  @ApiOperation({
    summary: "Update transaction status to demonstrate status update events",
  })
  @ApiResponse({
    status: 200,
    description: "Transaction status updated and event published",
  })
  async updateTransactionStatus(
    @Param("id") id: string,
    @Body() statusUpdate: { status: string; metadata?: any },
  ) {
    return this.transactionsService.update(id, {
      status: statusUpdate.status as any,
      metadata: statusUpdate.metadata,
    });
  }

  @Get("events/publisher/status")
  @ApiOperation({ summary: "Get message publisher status" })
  @ApiResponse({ status: 200, description: "Message publisher status" })
  getPublisherStatus() {
    return {
      bufferStatus: this.messagePublisher.getBufferStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post("events/publisher/flush")
  @ApiOperation({ summary: "Force flush buffered events" })
  @ApiResponse({ status: 200, description: "Events flushed successfully" })
  async forceFlushEvents() {
    await this.messagePublisher.forceFlush();
    return { message: "Events flushed successfully" };
  }

  @Post("status/:signature/update")
  @ApiOperation({ summary: "Update transaction status based on blockchain confirmation" })
  @ApiResponse({ status: 200, description: "Transaction status updated" })
  updateTransactionStatusBySignature(@Param("signature") signature: string) {
    return this.transactionsService.updateTransactionStatus(signature);
  }

  @Get("history/:address")
  @ApiOperation({ summary: "Get transaction history for an address" })
  @ApiResponse({ status: 200, description: "Transaction history", type: [Transaction] })
  getTransactionHistory(
    @Param("address") address: string,
    @Query("limit") limit?: number,
  ) {
    return this.transactionsService.getTransactionHistory(address, limit);
  }
}
