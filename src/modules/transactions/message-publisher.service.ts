import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Transaction } from '../transactions/transaction.entity';

export enum TransactionEventType {
  CREATED = 'transaction.created',
  STATUS_UPDATED = 'transaction.status_updated',
  CONFIRMED = 'transaction.confirmed',
  FAILED = 'transaction.failed',
}

export interface TransactionEvent {
  eventType: TransactionEventType;
  transactionId: string;
  signature: string;
  fromAddress?: string;
  toAddress?: string;
  amount: number;
  status: string;
  type: string;
  timestamp: Date;
  metadata?: any;
}

export interface TransactionEventMessage {
  key: string; // transaction signature
  value: TransactionEvent;
  headers?: Record<string, string>;
}

@Injectable()
export class MessagePublisherService implements OnModuleDestroy {
  private readonly logger = new Logger(MessagePublisherService.name);
  private readonly eventBuffer: TransactionEventMessage[] = [];
  private readonly maxBufferSize = 100;
  private flushInterval?: NodeJS.Timeout;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    // Start periodic flush of buffered events (skip in test environment)
    if (process.env.NODE_ENV !== 'test') {
      this.flushInterval = setInterval(() => {
        this.flushEvents();
      }, 5000); // Flush every 5 seconds
    }
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    // Flush any remaining events before shutdown
    await this.flushEvents();
  }

  /**
   * Publish a transaction creation event
   */
  async publishTransactionCreated(transaction: Transaction): Promise<void> {
    const event: TransactionEvent = {
      eventType: TransactionEventType.CREATED,
      transactionId: transaction.id,
      signature: transaction.signature,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: Number(transaction.amount),
      status: transaction.status,
      type: transaction.type,
      timestamp: new Date(),
      metadata: transaction.metadata,
    };

    await this.publishEvent('transactions', event, transaction.signature);
    this.logger.log(`Published transaction created event: ${transaction.signature}`);
  }

  /**
   * Publish a transaction status update event
   */
  async publishTransactionStatusUpdated(
    transaction: Transaction,
    previousStatus: string
  ): Promise<void> {
    const event: TransactionEvent = {
      eventType: TransactionEventType.STATUS_UPDATED,
      transactionId: transaction.id,
      signature: transaction.signature,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: Number(transaction.amount),
      status: transaction.status,
      type: transaction.type,
      timestamp: new Date(),
      metadata: {
        ...transaction.metadata,
        previousStatus,
      },
    };

    await this.publishEvent('transactions', event, transaction.signature);
    this.logger.log(`Published transaction status update: ${transaction.signature} (${previousStatus} -> ${transaction.status})`);
  }

  /**
   * Publish a transaction confirmation event
   */
  async publishTransactionConfirmed(transaction: Transaction): Promise<void> {
    const event: TransactionEvent = {
      eventType: TransactionEventType.CONFIRMED,
      transactionId: transaction.id,
      signature: transaction.signature,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: Number(transaction.amount),
      status: transaction.status,
      type: transaction.type,
      timestamp: new Date(),
      metadata: {
        ...transaction.metadata,
        slot: transaction.slot,
        blockTime: transaction.blockTime,
      },
    };

    await this.publishEvent('transactions', event, transaction.signature);
    this.logger.log(`Published transaction confirmed event: ${transaction.signature}`);
  }

  /**
   * Publish a transaction failure event
   */
  async publishTransactionFailed(
    transaction: Transaction,
    error?: string
  ): Promise<void> {
    const event: TransactionEvent = {
      eventType: TransactionEventType.FAILED,
      transactionId: transaction.id,
      signature: transaction.signature,
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: Number(transaction.amount),
      status: transaction.status,
      type: transaction.type,
      timestamp: new Date(),
      metadata: {
        ...transaction.metadata,
        error,
      },
    };

    await this.publishEvent('transactions', event, transaction.signature);
    this.logger.error(`Published transaction failed event: ${transaction.signature}`, error);
  }

  /**
   * Publish a generic transaction event
   */
  private async publishEvent(
    topic: string,
    event: TransactionEvent,
    key: string
  ): Promise<void> {
    const message: TransactionEventMessage = {
      key,
      value: event,
      headers: {
        'event-type': event.eventType,
        'transaction-id': event.transactionId,
        'timestamp': event.timestamp.toISOString(),
      },
    };

    try {
      // Buffer events for batch publishing
      this.eventBuffer.push(message);

      // Flush immediately if buffer is full
      if (this.eventBuffer.length >= this.maxBufferSize) {
        await this.flushEvents();
      }
    } catch (error) {
      this.logger.error(`Failed to buffer event for transaction ${key}`, error);
      throw error;
    }
  }

  /**
   * Flush buffered events to Kafka
   */
  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer.length = 0; // Clear buffer

    try {
      // Publish events in batch
      for (const event of eventsToFlush) {
        await this.kafkaClient.emit('transactions', event).toPromise();
      }

      this.logger.debug(`Flushed ${eventsToFlush.length} events to Kafka`);
    } catch (error) {
      this.logger.error('Failed to flush events to Kafka', error);

      // Re-queue failed events (simplified retry logic)
      // In production, you might want more sophisticated retry logic
      this.eventBuffer.unshift(...eventsToFlush);
      throw error;
    }
  }

  /**
   * Get current buffer status
   */
  getBufferStatus() {
    return {
      bufferedEvents: this.eventBuffer.length,
      maxBufferSize: this.maxBufferSize,
      isBufferFull: this.eventBuffer.length >= this.maxBufferSize,
    };
  }

  /**
   * Force flush all buffered events
   */
  async forceFlush(): Promise<void> {
    await this.flushEvents();
  }

  /**
   * Publish blockchain event (generic method for future use)
   */
  async publishBlockchainEvent(
    eventType: string,
    data: any,
    key?: string
  ): Promise<void> {
    const event = {
      eventType,
      data,
      timestamp: new Date(),
    };

    const message = {
      key: key || eventType,
      value: event,
      headers: {
        'event-type': eventType,
        'timestamp': event.timestamp.toISOString(),
      },
    };

    await this.kafkaClient.emit('blockchain-events', message).toPromise();
    this.logger.log(`Published blockchain event: ${eventType}`);
  }
}