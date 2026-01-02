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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from "@nestjs/swagger";
import { TransactionsService } from "./transactions.service";
import { MessagePublisherService } from "./message-publisher.service";
import { Transaction } from "./transaction.entity";
import { ProgramInvocationDto } from "./dto/program-invocation.dto";

/**
 * # Transactions Controller
 *
 * REST API for managing Solana transactions with async event processing via Kafka.
 *
 * ## Solana Transaction Model
 *
 * A Solana transaction consists of:
 * - **Signatures**: One or more Ed25519 signatures from required signers
 * - **Message**: The transaction payload containing:
 *   - `header`: Counts of required signers and read-only accounts
 *   - `accountKeys`: Array of all accounts used in the transaction
 *   - `recentBlockhash`: Prevents replay attacks (valid ~2 minutes)
 *   - `instructions`: Array of program instructions to execute
 *
 * ## Transaction Lifecycle
 *
 * ```
 * [Client] → POST /transactions/transfer → [API]
 *                                            ↓
 *                                     [Build Transaction]
 *                                            ↓
 *                                     [Sign Transaction]
 *                                            ↓
 *                                     [Submit to RPC]
 *                                            ↓
 *                                     [Store in DB]
 *                                            ↓
 *                              [Publish to Kafka 'transactions' topic]
 *                                            ↓
 *                              [TransactionEventConsumer processes]
 *                                            ↓
 *                               [Update status, send notifications]
 * ```
 *
 * ## Async Event Processing (Kafka)
 *
 * Transaction events are published to Kafka for async processing:
 *
 * - **Topic**: `transactions`
 * - **Events**:
 *   - `transaction.created`: New transaction submitted
 *   - `transaction.status_updated`: Status changed
 *   - `transaction.confirmed`: Transaction finalized on-chain
 *   - `transaction.failed`: Transaction failed
 *
 * The `TransactionEventConsumer` processes these events for:
 * - Updating monitoring dashboards
 * - Sending notifications
 * - Triggering downstream workflows
 * - Updating caches and analytics
 *
 * Events are buffered (max 100) and flushed every 5 seconds or when buffer is full.
 *
 * @example
 * ```typescript
 * // Send SOL transfer
 * POST /transactions/transfer
 * {
 *   "fromPrivateKey": "base58-encoded-private-key",
 *   "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
 *   "amount": 1000000000  // 1 SOL in lamports
 * }
 *
 * // Check event publisher status
 * GET /transactions/events/publisher/status
 * // Response: { "bufferedEvents": 5, "maxBufferSize": 100, "isBufferFull": false }
 * ```
 *
 * @see https://docs.solana.com/developing/programming-model/transactions - Transaction Model
 * @see https://docs.solana.com/cluster/commitments - Commitment Levels
 * @see [docs/diagrams/02-transactions-instructions.md](docs/diagrams/02-transactions-instructions.md) - Architecture
 */
@ApiTags("transactions")
@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly messagePublisher: MessagePublisherService,
  ) {}

  /**
   * Create a new transaction record in the database.
   *
   * This stores transaction metadata locally. Use specific endpoints
   * like `/transfer` or `/token-transfer` to actually submit transactions.
   *
   * **Async Flow**: Triggers `transaction.created` event to Kafka.
   */
  @Post()
  @ApiOperation({
    summary: "Create a new transaction record",
    description: "Store transaction metadata in database. Publishes `transaction.created` event to Kafka.",
  })
  @ApiResponse({
    status: 201,
    description: "Transaction created successfully",
    type: Transaction,
  })
  create(@Body() createTransactionDto: Partial<Transaction>) {
    return this.transactionsService.create(createTransactionDto);
  }

  /**
   * Retrieve all transaction records from the database.
   */
  @Get()
  @ApiOperation({
    summary: "Get all transactions",
    description: "Retrieve all stored transaction records.",
  })
  @ApiResponse({
    status: 200,
    description: "List of transactions",
    type: [Transaction],
  })
  findAll() {
    return this.transactionsService.findAll();
  }

  /**
   * Get a specific transaction by its database ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get transaction by ID",
    description: "Retrieve a transaction record by its database UUID.",
  })
  @ApiParam({ name: "id", description: "Database UUID of the transaction" })
  @ApiResponse({
    status: 200,
    description: "Transaction details",
    type: Transaction,
  })
  findOne(@Param("id") id: string) {
    return this.transactionsService.findOne(id);
  }

  /**
   * Find a transaction by its on-chain signature.
   *
   * Solana transaction signatures are 88-character base58 strings
   * that uniquely identify each transaction.
   *
   * @example
   * ```bash
   * curl http://localhost:3000/transactions/signature/5rVyH...xyz
   * ```
   */
  @Get("signature/:signature")
  @ApiOperation({
    summary: "Get transaction by signature",
    description: "Find transaction by its 88-character base58 signature.",
  })
  @ApiParam({ name: "signature", description: "Solana transaction signature (base58)" })
  @ApiResponse({
    status: 200,
    description: "Transaction details",
    type: Transaction,
  })
  findBySignature(@Param("signature") signature: string) {
    return this.transactionsService.findBySignature(signature);
  }

  /**
   * Update a transaction record.
   *
   * **Async Flow**: Status changes trigger `transaction.status_updated` event.
   */
  @Put(":id")
  @ApiOperation({
    summary: "Update transaction",
    description: "Update transaction record. Status changes publish events to Kafka.",
  })
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

  /**
   * Delete a transaction record from the database.
   */
  @Delete(":id")
  @ApiOperation({
    summary: "Delete transaction",
    description: "Remove a transaction record from the local database.",
  })
  @ApiResponse({ status: 200, description: "Transaction deleted successfully" })
  remove(@Param("id") id: string) {
    return this.transactionsService.remove(id);
  }

  /**
   * Fetch transaction details directly from the Solana blockchain.
   *
   * Returns full transaction data including:
   * - All signatures
   * - Account keys
   * - Instructions (decoded when possible)
   * - Slot and block time
   * - Logs and return data
   *
   * @example
   * ```bash
   * curl http://localhost:3000/transactions/details/5rVyH...xyz
   * ```
   */
  @Get("details/:signature")
  @ApiOperation({
    summary: "Get transaction details from Solana",
    description: "Fetch full transaction data from blockchain by signature.",
  })
  @ApiResponse({ status: 200, description: "Transaction details from Solana" })
  getTransaction(@Param("signature") signature: string) {
    return this.transactionsService.getTransaction(signature);
  }

  /**
   * Send a SOL transfer transaction.
   *
   * ## Transfer Flow
   *
   * 1. Build transaction with System Program transfer instruction
   * 2. Get recent blockhash (valid ~2 minutes)
   * 3. Sign with sender's private key
   * 4. Submit to RPC and wait for confirmation
   * 5. Store transaction record
   * 6. Publish `transaction.created` event to Kafka
   *
   * **Security Note**: Never expose private keys in production.
   * Use hardware wallets or MPC signing instead.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/transactions/transfer \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "fromPrivateKey": "base58-private-key",
   *     "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
   *     "amount": 1000000000
   *   }'
   * # Response: { "signature": "5rVy...", "status": "confirmed" }
   * ```
   *
   * @see https://docs.solana.com/developing/clients/javascript-reference#sendtransaction
   */
  @Post("transfer")
  @ApiOperation({
    summary: "Send SOL transfer transaction",
    description: "Build, sign, and submit a SOL transfer. Publishes transaction events to Kafka.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        fromPrivateKey: { type: "string", description: "Sender's base58-encoded private key" },
        toAddress: { type: "string", description: "Recipient's public key" },
        amount: { type: "number", description: "Amount in lamports (1 SOL = 1e9 lamports)" },
      },
      required: ["fromPrivateKey", "toAddress", "amount"],
    },
  })
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

  /**
   * Send an SPL token transfer transaction.
   *
   * Transfers tokens between Associated Token Accounts (ATAs).
   * Creates recipient's ATA if it doesn't exist.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/transactions/token-transfer \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "fromPrivateKey": "base58-private-key",
   *     "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
   *     "mintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
   *     "amount": 1000000
   *   }'
   * ```
   *
   * @see https://spl.solana.com/token
   */
  @Post("token-transfer")
  @ApiOperation({
    summary: "Send token transfer transaction",
    description: "Transfer SPL tokens between wallets. Auto-creates recipient ATA if needed.",
  })
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

  /**
   * Create a transaction with multiple instructions.
   *
   * ## Multi-Instruction Transactions
   *
   * Solana transactions can contain up to ~1232 bytes of instructions.
   * Multiple instructions execute atomically - all succeed or all fail.
   *
   * Common use cases:
   * - Batch transfers
   * - DeFi operations (swap + stake)
   * - NFT minting (create mint + metadata + mint tokens)
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/transactions/multi-instruction \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "privateKey": "base58-private-key",
   *     "instructions": [
   *       {
   *         "programId": "11111111111111111111111111111111",
   *         "accounts": [
   *           { "pubkey": "sender", "isSigner": true, "isWritable": true },
   *           { "pubkey": "recipient", "isSigner": false, "isWritable": true }
   *         ],
   *         "data": "base64-encoded-instruction-data"
   *       }
   *     ]
   *   }'
   * ```
   */
  @Post("multi-instruction")
  @ApiOperation({
    summary: "Create multi-instruction transaction",
    description: "Build transaction with multiple instructions that execute atomically.",
  })
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

  /**
   * Invoke a Solana program with custom instruction data.
   *
   * Low-level endpoint for calling any on-chain program.
   * Useful for custom programs or advanced use cases.
   *
   * @see https://docs.solana.com/developing/programming-model/calling-between-programs
   */
  @Post("program-invocation")
  @ApiOperation({
    summary: "Create program invocation transaction",
    description: "Invoke any on-chain program with custom instruction data.",
  })
  @ApiResponse({
    status: 201,
    description: "Program invocation transaction created successfully",
  })
  createProgramInvocationTransaction(
    @Body() invocationDto: ProgramInvocationDto,
  ) {
    return this.transactionsService.sendProgramInvocation(
      invocationDto.privateKey,
      invocationDto.programId,
      invocationDto.data,
      invocationDto.accounts,
      invocationDto.maxComputeUnits,
    );
  }

  /**
   * Create a batched transaction with multiple operations.
   *
   * Higher-level API that combines common operations into one transaction.
   *
   * @example
   * ```bash
   * curl -X POST http://localhost:3000/transactions/batch \
   *   -H "Content-Type: application/json" \
   *   -d '{
   *     "privateKey": "base58-private-key",
   *     "operations": [
   *       { "type": "transfer", "params": { "to": "addr1", "amount": 1000000 } },
   *       { "type": "token_transfer", "params": { "to": "addr2", "mint": "...", "amount": 100 } }
   *     ]
   *   }'
   * ```
   */
  @Post("batch")
  @ApiOperation({
    summary: "Create batched transaction with multiple operations",
    description: "Combine multiple transfer/token operations into one atomic transaction.",
  })
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

  /**
   * Get recent transactions from the network.
   */
  @Get("recent/list")
  @ApiOperation({
    summary: "Get recent transactions",
    description: "Fetch recent transactions from the Solana network.",
  })
  @ApiQuery({ name: "limit", required: false, description: "Max number of transactions (default: 10)" })
  @ApiResponse({ status: 200, description: "List of recent transactions" })
  getRecentTransactions(@Query("limit") limit?: number) {
    return this.transactionsService.getRecentTransactions(limit);
  }

  /**
   * Get current fee estimate for a transaction.
   *
   * Returns base fee plus priority fee recommendations.
   *
   * @see https://docs.solana.com/transaction_fees
   */
  @Get("fee/estimate")
  @ApiOperation({
    summary: "Get fee estimate",
    description: "Get current network fee estimate including priority fees.",
  })
  @ApiResponse({ status: 200, description: "Fee estimate" })
  getFeeEstimate() {
    return this.transactionsService.getFeeEstimate();
  }

  /**
   * Create a test transaction to demonstrate event publishing.
   *
   * ## Kafka Event Flow Demo
   *
   * This endpoint creates a test transaction and publishes events to Kafka:
   *
   * ```
   * POST /transactions/events/test
   *           ↓
   * [Create test transaction in DB]
   *           ↓
   * [Publish to Kafka 'transactions' topic]
   *           ↓
   * [TransactionEventConsumer.handleTransactionCreated()]
   *           ↓
   * [Log: "Processing transaction created: {id}"]
   * ```
   *
   * View consumer logs to see event processing.
   */
  @Post("events/test")
  @ApiOperation({
    summary: "Create a test transaction to demonstrate event publishing",
    description: "Creates a test transaction and publishes `transaction.created` event to Kafka for demonstration.",
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

  /**
   * Update transaction status to demonstrate status update events.
   *
   * ## Kafka Status Update Flow
   *
   * ```
   * POST /transactions/:id/events/status-update
   *           ↓
   * [Update status in DB]
   *           ↓
   * [Publish to Kafka 'transactions' topic with event type STATUS_UPDATED]
   *           ↓
   * [TransactionEventConsumer.handleTransactionStatusUpdated()]
   *           ↓
   * [Log: "Processing status update: {id} (pending -> confirmed)"]
   * ```
   *
   * Valid statuses: `pending`, `confirmed`, `finalized`, `failed`
   */
  @Post(":id/events/status-update")
  @ApiOperation({
    summary: "Update transaction status to demonstrate status update events",
    description: "Update status and publish `transaction.status_updated` event to Kafka.",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "confirmed", "finalized", "failed"] },
        metadata: { type: "object", description: "Optional additional metadata" },
      },
      required: ["status"],
    },
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

  /**
   * Get the current status of the Kafka message publisher.
   *
   * ## Message Buffering
   *
   * Events are buffered before sending to Kafka for efficiency:
   * - Max buffer size: 100 events
   * - Flush interval: 5 seconds
   * - Immediate flush when buffer is full
   *
   * @returns Current buffer status
   */
  @Get("events/publisher/status")
  @ApiOperation({
    summary: "Get message publisher status",
    description: "Check how many events are buffered and pending Kafka delivery.",
  })
  @ApiResponse({
    status: 200,
    description: "Message publisher status",
    schema: {
      type: "object",
      properties: {
        bufferStatus: {
          type: "object",
          properties: {
            bufferedEvents: { type: "number" },
            maxBufferSize: { type: "number" },
            isBufferFull: { type: "boolean" },
          },
        },
        timestamp: { type: "string" },
      },
    },
  })
  getPublisherStatus() {
    return {
      bufferStatus: this.messagePublisher.getBufferStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Force flush all buffered events to Kafka immediately.
   *
   * Useful for testing or before graceful shutdown.
   */
  @Post("events/publisher/flush")
  @ApiOperation({
    summary: "Force flush buffered events",
    description: "Immediately send all buffered events to Kafka without waiting for flush interval.",
  })
  @ApiResponse({ status: 200, description: "Events flushed successfully" })
  async forceFlushEvents() {
    await this.messagePublisher.forceFlush();
    return { message: "Events flushed successfully" };
  }

  /**
   * Update transaction status based on blockchain confirmation.
   *
   * Queries Solana RPC to check if transaction is confirmed/finalized.
   */
  @Post("status/:signature/update")
  @ApiOperation({
    summary: "Update transaction status based on blockchain confirmation",
    description: "Query Solana RPC and update local record with current confirmation status.",
  })
  @ApiResponse({ status: 200, description: "Transaction status updated" })
  updateTransactionStatusBySignature(@Param("signature") signature: string) {
    return this.transactionsService.updateTransactionStatus(signature);
  }

  /**
   * Get transaction history for a specific address.
   *
   * @example
   * ```bash
   * curl "http://localhost:3000/transactions/history/9WzDXw...?limit=10"
   * ```
   */
  @Get("history/:address")
  @ApiOperation({
    summary: "Get transaction history for an address",
    description: "Retrieve transaction history involving a specific Solana address.",
  })
  @ApiParam({ name: "address", description: "Solana public key (base58)" })
  @ApiQuery({ name: "limit", required: false, description: "Max transactions to return" })
  @ApiResponse({ status: 200, description: "Transaction history", type: [Transaction] })
  getTransactionHistory(
    @Param("address") address: string,
    @Query("limit") limit?: number,
  ) {
    return this.transactionsService.getTransactionHistory(address, limit);
  }
}
