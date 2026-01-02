import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { SmartAccountsService } from './smart-accounts.service';

/**
 * # Smart Accounts Consumer
 *
 * Kafka consumer for processing smart account authorization requests.
 *
 * ## Async Authorization Flow
 *
 * Smart accounts can authorize transactions asynchronously via Kafka:
 *
 * ```
 * [External Service] → Publish to 'transaction.authorization.requested'
 *           ↓
 * [SmartAccountsConsumer.handleAuthorizationRequest()]
 *           ↓
 * [SmartAccountsService.validateTransaction()]
 *           ↓
 *     ┌─────┴─────┐
 *     ↓           ↓
 * [Valid]     [Invalid]
 *     ↓           ↓
 * [Record Usage] [Log Rejection]
 *     ↓           ↓
 * [Emit 'transaction.authorized'] [Emit 'transaction.rejected']
 * ```
 *
 * ## Message Format
 *
 * ```json
 * {
 *   "transactionId": "tx-uuid",
 *   "smartAccountAddress": "account-address",
 *   "amount": 1000000,
 *   "programId": "program-to-call"
 * }
 * ```
 *
 * ## Output Events
 *
 * | Event | Condition | Payload |
 * |-------|-----------|---------|
 * | `transaction.authorized` | Rules passed | transactionId, timestamp |
 * | `transaction.rejected` | Rules failed | transactionId, reason |
 *
 * ## Use Cases
 *
 * - Session key authorization for dApps
 * - Spending limit enforcement
 * - Program allowlist validation
 * - Daily limit tracking
 *
 * @see [SmartAccountsController](./smart-accounts.controller.ts) - REST API
 * @see [SmartAccountsService](./smart-accounts.service.ts) - Business logic
 */
@Injectable()
export class SmartAccountsConsumer {
  private readonly logger = new Logger(SmartAccountsConsumer.name);

  constructor(
    private readonly smartAccountsService: SmartAccountsService,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Handle incoming authorization requests.
   *
   * Validates the transaction against smart account rules and
   * emits authorization decision to appropriate Kafka topic.
   *
   * @param message - Authorization request payload
   * @param context - Kafka context
   */
  @EventPattern('transaction.authorization.requested')
  async handleAuthorizationRequest(@Payload() message: any, @Ctx() context: KafkaContext) {
    const { transactionId, smartAccountAddress, amount, programId } = message;

    // Check if we have required fields
    if (!transactionId || !smartAccountAddress) {
      this.logger.error('invalid authorization request message');
      return;
    }

    this.logger.log(`processing auth request for ${transactionId}`);

    const result = await this.smartAccountsService.validateTransaction(
      smartAccountAddress,
      amount,
      programId,
    );

    if (result.valid) {
      // Record usage if authorized
      await this.smartAccountsService.recordTransaction(smartAccountAddress, amount);

      // Emit authorized event
      this.kafkaClient.emit('transaction.authorized', {
        transactionId,
        smartAccountAddress,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`transaction ${transactionId} authorized`);
    } else {
      // emit rejected event
      this.kafkaClient.emit('transaction.rejected', {
        transactionId,
        smartAccountAddress,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      });
      this.logger.log(`transaction ${transactionId} rejected: ${result.reason}`);
    }
  }
}
