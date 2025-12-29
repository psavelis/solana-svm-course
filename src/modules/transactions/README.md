# Transaction Event Publishing

This module implements asynchronous event publishing for Solana transactions using Apache Kafka. The system provides real-time event streaming for transaction lifecycle management, enabling event-driven architectures and microservices communication.

## Overview

The transaction event publishing system consists of:

- **MessagePublisherService**: Handles event publishing with buffering and batching
- **TransactionEventConsumer**: Processes published events asynchronously
- **Event Types**: Structured event schemas for different transaction states
- **Integration**: Straightforward integration with transaction CRUD operations

## Architecture

### Event Flow
```
Transaction Operation → MessagePublisherService → Kafka Topic → TransactionEventConsumer → Processing
```

### Event Types

#### Transaction Created Event
Published when a new transaction record is created in the database.

```typescript
{
  eventType: 'transaction.created',
  transactionId: string,
  signature: string,
  fromAddress?: string,
  toAddress?: string,
  amount: number,
  status: string,
  type: string,
  timestamp: Date,
  metadata?: any
}
```

#### Transaction Status Updated Event
Published when a transaction status changes (e.g., pending → confirmed).

```typescript
{
  eventType: 'transaction.status_updated',
  transactionId: string,
  signature: string,
  fromAddress?: string,
  toAddress?: string,
  amount: number,
  status: string,
  type: string,
  timestamp: Date,
  metadata: {
    previousStatus: string,
    ...otherMetadata
  }
}
```

#### Transaction Confirmed Event
Published when a transaction is confirmed on the Solana blockchain.

```typescript
{
  eventType: 'transaction.confirmed',
  transactionId: string,
  signature: string,
  fromAddress?: string,
  toAddress?: string,
  amount: number,
  status: string,
  type: string,
  timestamp: Date,
  metadata: {
    slot: number,
    blockTime: Date,
    ...otherMetadata
  }
}
```

#### Transaction Failed Event
Published when a transaction fails during processing.

```typescript
{
  eventType: 'transaction.failed',
  transactionId: string,
  signature: string,
  fromAddress?: string,
  toAddress?: string,
  amount: number,
  status: string,
  type: string,
  timestamp: Date,
  metadata: {
    error: string,
    ...otherMetadata
  }
}
```

## Message Publisher Service

### Features
- **Event Buffering**: Batches events for efficient publishing (max 100 events)
- **Periodic Flushing**: Automatically flushes events every 5 seconds
- **Error Handling**: Graceful error handling with retry logic
- **Health Monitoring**: Buffer status and health checks

### Configuration
```typescript
// Buffer size configuration
private readonly maxBufferSize = 100;

// Flush interval (in test environment, disabled)
private flushInterval?: NodeJS.Timeout;
```

### API Methods

#### Publish Transaction Events
```typescript
// Publish transaction created event
await messagePublisher.publishTransactionCreated(transaction);

// Publish status update event
await messagePublisher.publishTransactionStatusUpdated(transaction, previousStatus);

// Publish confirmation event
await messagePublisher.publishTransactionConfirmed(transaction);

// Publish failure event
await messagePublisher.publishTransactionFailed(transaction, errorMessage);
```

#### Buffer Management
```typescript
// Get buffer status
const status = messagePublisher.getBufferStatus();
// Returns: { bufferedEvents: number, maxBufferSize: number, isBufferFull: boolean }

// Force flush all buffered events
await messagePublisher.forceFlush();
```

## Transaction Event Consumer

### Features
- **Event Processing**: Handles different event types with specific logic
- **Error Handling**: Failed events are sent to dead letter queue
- **Offset Management**: Manual offset commits for processed events
- **Health Monitoring**: Consumer status and processing metrics

### Event Processing Logic

#### Transaction Created
- Updates transaction metrics
- Triggers additional validation
- Sends notifications
- Updates caches

#### Transaction Status Updated
- Updates monitoring dashboards
- Triggers alerts for failed transactions
- Updates transaction statistics
- Sends status update notifications

#### Transaction Confirmed
- Updates wallet balances
- Sends confirmation notifications
- Updates transaction history
- Triggers downstream processes

#### Transaction Failed
- Sends failure notifications
- Updates error metrics
- Triggers retry mechanisms
- Logs for analysis

## Integration with Transactions Service

The event publishing is seamlessly integrated with transaction operations:

### Automatic Event Publishing
```typescript
// Creating a transaction automatically publishes created event
const transaction = await transactionsService.create(transactionData);

// Updating status automatically publishes status update event
await transactionsService.update(id, { status: TransactionStatus.CONFIRMED });

// Transfer operations publish confirmation or failure events
await transactionsService.sendTransfer(privateKey, toAddress, amount);
```

### Controller Endpoints

#### Test Event Publishing
```bash
POST /transactions/events/test
```
Creates a test transaction to demonstrate event publishing.

#### Update Transaction Status
```bash
POST /transactions/:id/events/status-update
Content-Type: application/json

{
  "status": "confirmed",
  "metadata": { "confirmedAt": "2025-01-01T00:00:00Z" }
}
```

#### Publisher Status
```bash
GET /transactions/events/publisher/status
```
Returns buffer status and health information.

#### Force Flush Events
```bash
POST /transactions/events/publisher/flush
```
Manually flushes all buffered events to Kafka.

## Kafka Configuration

### Topics
- `transactions`: Main topic for transaction events
- `blockchain-events`: Generic blockchain events (future use)
- `transaction-events-dlq`: Dead letter queue for failed events

### Consumer Groups
- `transaction-events-consumer`: Main consumer group for transaction events

### Message Headers
All messages include standard headers:
```typescript
{
  'event-type': string,        // Event type identifier
  'transaction-id': string,    // Transaction ID
  'timestamp': string          // ISO timestamp
}
```

## Error Handling

### Publisher Errors
- Network failures are retried automatically
- Buffer overflow is prevented with size limits
- Failed publishes are logged with full context

### Consumer Errors
- Processing failures trigger dead letter queue
- Offset commits are skipped for failed messages
- In-depth error logging for debugging

### Dead Letter Queue
Failed messages are sent to DLQ with:
- Original message content
- Error details and stack trace
- Retry count
- Timestamp

## Testing

### Unit Tests
- MessagePublisherService: Event publishing, buffering, error handling
- TransactionEventConsumer: Event processing, error scenarios
- TransactionsService: Integration with event publishing

### Integration Tests
- End-to-end event publishing flow
- Buffer management and flushing
- Consumer processing and health checks

### Test Coverage
- Event publishing logic: 95%+
- Error handling scenarios: 90%+
- Buffer management: 100%
- Consumer processing: 85%+

## Performance Considerations

### Buffering Strategy
- Reduces Kafka network calls
- Batches similar events together
- Prevents message flooding

### Consumer Scaling
- Consumer groups enable horizontal scaling
- Offset management prevents duplicate processing
- Dead letter queue prevents poison message issues

### Monitoring
- Buffer size monitoring
- Event processing latency
- Error rates and dead letter queue size
- Consumer lag monitoring

## Security Considerations

### Message Encryption
- Sensitive data should be encrypted before publishing
- Use Kafka's built-in encryption features

### Authentication
- Implement Kafka ACLs for topic access
- Use SASL authentication for producers/consumers

### Audit Trail
- All events include timestamps and transaction IDs
- Dead letter queue provides failure audit trail
- In-depth logging for security events

## Future Enhancements

### Message Schema Validation
- JSON Schema validation for event structures
- Schema evolution with backward compatibility

### Event Sourcing
- Store events for audit and replay capabilities
- Implement event sourcing patterns

### Advanced Routing
- Content-based routing for different event types
- Geographic distribution for global deployments

### Monitoring Dashboard
- Real-time event processing metrics
- Alerting for failed events and consumer lag
- Performance dashboards with Grafana