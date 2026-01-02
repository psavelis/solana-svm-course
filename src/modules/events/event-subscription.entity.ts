import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Subscription Type Enum
 * usage: defines the delivery mechanism for event notifications
 * reference: https://solana.com/docs/rpc/websocket
 */
export enum SubscriptionType {
  WEBSOCKET = 'websocket',
  WEBHOOK = 'webhook',
  KAFKA = 'kafka',
}

/**
 * Subscription Status Enum
 * usage: controls the active state of a subscription
 * reference: none
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

/**
 * Event Subscription Entity
 *
 * Represents a subscription to Solana blockchain events. Subscriptions define how
 * clients receive notifications when filtered events occur. This supports multiple
 * delivery mechanisms including WebSocket, webhooks, and Kafka.
 *
 * Key subscription concepts:
 * - WebSocket: Real-time bidirectional communication for low-latency updates
 * - Webhook: HTTP callbacks to client endpoints for server-to-server notifications
 * - Kafka: Message queue integration for high-throughput event streaming
 *
 * Solana RPC provides native WebSocket subscriptions for:
 * - accountSubscribe: Monitor account data changes
 * - programSubscribe: Track program account changes
 * - signatureSubscribe: Watch transaction confirmations
 * - slotSubscribe: Receive slot updates
 *
 * @example
 * const sub = new EventSubscription();
 * sub.subscriptionType = SubscriptionType.WEBHOOK;
 * sub.eventType = "transaction_confirmed";
 * sub.endpoint = "https://myapp.com/webhooks/solana";
 *
 * @see https://solana.com/docs/rpc/websocket
 */
@Entity('event_subscriptions')
@Index(['clientId'])
@Index(['eventType'])
@Index(['status'])
export class EventSubscription {
  /**
   * unique identifier for the subscription
   * usage: internal database reference and unsubscribe key
   * example: "d4e5f6g7-h8i9-0j1k-2l3m-4n5o6p7q8r9s"
   * reference: https://typeorm.io/entities#primary-columns
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * identifier of the subscribing client
   * usage: associates subscription with a specific user or service
   * example: "client_abc123"
   * reference: none
   */
  @Column({ type: 'varchar', length: 255 })
  @Index()
  clientId: string; // Unique identifier for the subscribing client

  /**
   * type of event to subscribe to (supports wildcards)
   * usage: determines which events trigger notifications
   * example: "transaction_confirmed" or "*" for all events
   * reference: none
   */
  @Column({ type: 'varchar', length: 100 })
  eventType: string; // Event type to subscribe to (can be wildcard)

  /**
   * delivery mechanism for notifications
   * usage: determines how events are delivered to the client
   * example: "websocket"
   * reference: https://solana.com/docs/rpc/websocket
   */
  @Column({
    type: 'enum',
    enum: SubscriptionType,
  })
  subscriptionType: SubscriptionType;

  /**
   * additional filters applied to the subscription
   * usage: narrows down events based on custom criteria
   * example: { "minAmount": 1000000, "programId": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" }
   * reference: none
   */
  @Column({ type: 'jsonb', nullable: true })
  filters?: any; // Additional filters for the subscription

  /**
   * destination endpoint for webhook/kafka subscriptions
   * usage: url for webhooks or topic name for kafka
   * example: "https://myapp.com/webhooks/solana" or "solana-events"
   * reference: none
   */
  @Column({ type: 'varchar', nullable: true })
  endpoint?: string; // Webhook URL or Kafka topic

  /**
   * current status of the subscription
   * usage: controls whether events are delivered
   * example: "active"
   * reference: none
   */
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  /**
   * optional expiration timestamp
   * usage: automatically deactivates subscription after this time
   * example: "2024-12-31T23:59:59Z"
   * reference: none
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date; // Optional expiration

  /**
   * additional subscription configuration
   * usage: stores retry policies, batching settings, etc.
   * example: { "maxRetries": 3, "batchSize": 100 }
   * reference: none
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Additional subscription metadata

  /**
   * timestamp when the subscription was created
   * usage: audit trail
   * example: "2024-01-15T10:00:00Z"
   * reference: https://typeorm.io/entities#createdatecolumn
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * timestamp when the subscription was last updated
   * usage: tracks configuration changes
   * example: "2024-01-16T11:00:00Z"
   * reference: https://typeorm.io/entities#updatedatecolumn
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
