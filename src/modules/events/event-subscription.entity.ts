import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum SubscriptionType {
  WEBSOCKET = "websocket",
  WEBHOOK = "webhook",
  KAFKA = "kafka",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

@Entity("event_subscriptions")
@Index(["clientId"])
@Index(["eventType"])
@Index(["status"])
export class EventSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  @Index()
  clientId: string; // Unique identifier for the subscribing client

  @Column({ type: "varchar", length: 100 })
  eventType: string; // Event type to subscribe to (can be wildcard)

  @Column({
    type: "enum",
    enum: SubscriptionType,
  })
  subscriptionType: SubscriptionType;

  @Column({ type: "jsonb", nullable: true })
  filters?: any; // Additional filters for the subscription

  @Column({ type: "varchar", nullable: true })
  endpoint?: string; // Webhook URL or Kafka topic

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date; // Optional expiration

  @Column({ type: "jsonb", nullable: true })
  metadata?: any; // Additional subscription metadata

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
