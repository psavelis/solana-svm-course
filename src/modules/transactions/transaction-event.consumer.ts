import { Injectable, Logger, OnModuleInit, Inject } from "@nestjs/common";
import {
  ClientKafka,
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from "@nestjs/microservices";
import {
  TransactionEvent,
  TransactionEventType,
} from "./message-publisher.service";

@Injectable()
export class TransactionEventConsumer implements OnModuleInit {
  private readonly logger = new Logger(TransactionEventConsumer.name);

  constructor(
    @Inject("KAFKA_SERVICE") private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Subscribe to transaction events topic
    this.kafkaClient.subscribeToResponseOf("transactions");
    this.kafkaClient.subscribeToResponseOf("transaction-events-dlq");
    await this.kafkaClient.connect();

    this.logger.log(
      "Transaction event consumer initialized and connected to Kafka",
    );
  }

  /**
   * Handle transaction created events
   */
  @EventPattern("transactions")
  async handleTransactionEvent(
    @Payload()
    message: {
      key: string;
      value: TransactionEvent;
      headers?: Record<string, string>;
    },
    @Ctx() context: KafkaContext,
  ) {
    const { key, value: event, headers } = message;
    const retryCount = headers?.["retry-count"]
      ? parseInt(headers["retry-count"], 10)
      : 0;
    const MAX_RETRIES = 3;

    try {
      this.logger.log(
        `Received transaction event: ${event.eventType} for transaction ${event.transactionId} (Retry: ${retryCount})`,
      );

      switch (event.eventType) {
        case TransactionEventType.CREATED:
          await this.handleTransactionCreated(event);
          break;

        case TransactionEventType.STATUS_UPDATED:
          await this.handleTransactionStatusUpdated(event);
          break;

        case TransactionEventType.CONFIRMED:
          await this.handleTransactionConfirmed(event);
          break;

        case TransactionEventType.FAILED:
          await this.handleTransactionFailed(event);
          break;

        default:
          this.logger.warn(`Unknown event type: ${event.eventType}`);
      }

      // Acknowledge successful processing
      context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (BigInt(context.getMessage().offset) + BigInt(1)).toString(),
        },
      ]);
    } catch (error) {
      this.logger.error(
        `Failed to process transaction event ${event.eventType}: ${event.transactionId}`,
        error,
      );

      if (retryCount < MAX_RETRIES) {
        this.logger.log(
          `Retrying transaction event ${event.transactionId} (Attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        await this.retryMessage(message, retryCount + 1);
      } else {
        this.logger.error(
          `Max retries reached for transaction ${event.transactionId}. Sending to DLQ.`,
        );
        await this.sendToDeadLetterQueue(message, error, retryCount);
      }

      // Always commit offset to avoid blocking the partition with a bad message
      // since we've either scheduled a retry or sent to DLQ
      context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (BigInt(context.getMessage().offset) + BigInt(1)).toString(),
        },
      ]);
    }
  }

  /**
   * Handle transaction created event
   */
  private async handleTransactionCreated(
    event: TransactionEvent,
  ): Promise<void> {
    this.logger.log(`Processing transaction created: ${event.transactionId}`);

    // Example processing logic:
    // - Update transaction metrics
    // - Trigger additional validation
    // - Send notifications
    // - Update caches

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.log(
      `Successfully processed transaction created event: ${event.transactionId}`,
    );
  }

  /**
   * Handle transaction status updated event
   */
  private async handleTransactionStatusUpdated(
    event: TransactionEvent,
  ): Promise<void> {
    this.logger.log(
      `Processing transaction status update: ${event.transactionId} (${event.metadata?.previousStatus} -> ${event.status})`,
    );

    // Example processing logic:
    // - Update monitoring dashboards
    // - Trigger alerts for failed transactions
    // - Update transaction statistics
    // - Send status update notifications

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 50));

    this.logger.log(
      `Successfully processed transaction status update: ${event.transactionId}`,
    );
  }

  /**
   * Handle transaction confirmed event
   */
  private async handleTransactionConfirmed(
    event: TransactionEvent,
  ): Promise<void> {
    this.logger.log(`Processing transaction confirmed: ${event.transactionId}`);

    // Example processing logic:
    // - Update wallet balances
    // - Send confirmation notifications
    // - Update transaction history
    // - Trigger downstream processes

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 200));

    this.logger.log(
      `Successfully processed transaction confirmed event: ${event.transactionId}`,
    );
  }

  /**
   * Handle transaction failed event
   */
  private async handleTransactionFailed(
    event: TransactionEvent,
  ): Promise<void> {
    this.logger.error(
      `Processing transaction failed: ${event.transactionId}`,
      event.metadata?.error,
    );

    // Example processing logic:
    // - Send failure notifications
    // - Update error metrics
    // - Trigger retry mechanisms
    // - Log for analysis

    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 150));

    this.logger.log(
      `Successfully processed transaction failed event: ${event.transactionId}`,
    );
  }

  /**
   * Retry message by re-publishing with incremented retry count
   */
  private async retryMessage(
    originalMessage: {
      key: string;
      value: TransactionEvent;
      headers?: Record<string, string>;
    },
    retryCount: number,
  ): Promise<void> {
    const headers = {
      ...originalMessage.headers,
      "retry-count": retryCount.toString(),
    };

    // Re-emit to the same topic
    await this.kafkaClient
      .emit("transactions", {
        key: originalMessage.key,
        value: originalMessage.value,
        headers,
      })
      .toPromise();
  }

  /**
   * Send failed messages to dead letter queue
   */
  private async sendToDeadLetterQueue(
    originalMessage: any,
    error: any,
    retryCount: number = 0,
  ): Promise<void> {
    try {
      const dlqMessage = {
        originalMessage,
        error: {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        retryCount: retryCount,
      };

      // Publish to a dead letter queue topic
      await this.kafkaClient
        .emit("transaction-events-dlq", dlqMessage)
        .toPromise();

      this.logger.warn(
        `Sent message to dead letter queue: ${originalMessage.value.transactionId}`,
        dlqMessage.error,
      );
    } catch (dlqError) {
      this.logger.error(
        "Failed to send message to dead letter queue",
        dlqError,
      );
    }
  }

  /**
   * Get consumer health status
   */
  getHealthStatus() {
    return {
      consumer: "transaction-events",
      status: "healthy",
      topics: ["transactions"],
      lastProcessed: new Date().toISOString(),
    };
  }
}
