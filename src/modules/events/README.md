# Events Module (Real-time Event Streaming)

This module implements comprehensive real-time event monitoring and streaming for the Solana SVM study repository. It provides WebSocket connections, event filtering, persistence, and replay capabilities for blockchain events.

## Features

- **WebSocket Gateway**: Real-time event streaming with Socket.IO
- **Event Persistence**: Complete audit trail of all blockchain events
- **Subscription Management**: Flexible event subscriptions with filtering
- **Event Filtering**: Advanced filtering capabilities for targeted monitoring
- **Blockchain Monitoring**: Automatic monitoring of transactions, accounts, and slots
- **Event Replay**: Historical event replay for catch-up scenarios
- **Multi-Client Support**: Support for WebSocket, webhook, and Kafka subscriptions

## Entities

### Event
Represents blockchain events with full metadata and status tracking.

### EventSubscription
Manages client subscriptions to specific event types with filtering.

### EventFilter
Defines reusable filters for event monitoring and alerting.

## WebSocket API

### Connection
```javascript
const socket = io('ws://localhost:3000/events', {
  query: { clientId: 'your-client-id' }
});
```

### Subscription
```javascript
// Subscribe to events
socket.emit('subscribe', {
  eventTypes: ['transaction_confirmed', 'account_changed'],
  filters: { minAmount: 1000 }
});

// Unsubscribe from events
socket.emit('unsubscribe', {
  eventTypes: ['transaction_confirmed']
});

// Ping for connection health
socket.emit('ping');
```

### Event Reception
```javascript
socket.on('event', (event) => {
  console.log('Received event:', event);
  // {
  //   eventType: 'transaction_confirmed',
  //   data: { ... },
  //   source: 'transaction-signature',
  //   timestamp: '2025-12-29T...'
  // }
});
```

## REST API Endpoints

### Events
- `POST /events` - Create custom events
- `GET /events` - Get events with filtering
- `PUT /events/:id` - Update event status

### Subscriptions
- `POST /events/subscriptions` - Create event subscription
- `GET /events/subscriptions/:clientId` - Get client subscriptions
- `PUT /events/subscriptions/:id` - Update subscription
- `DELETE /events/subscriptions/:id` - Delete subscription

### Filters
- `POST /events/filters` - Create event filter
- `GET /events/filters/:ownerId` - Get owner filters
- `GET /events/filters/public/all` - Get public filters
- `PUT /events/filters/:id` - Update filter
- `DELETE /events/filters/:id` - Delete filter

### Monitoring
- `POST /events/monitor/account/:accountId` - Monitor account changes
- `DELETE /events/monitor/account/:accountId` - Stop monitoring account
- `POST /events/monitor/program/:programId` - Monitor program accounts

### Analytics
- `GET /events/stats` - Get system statistics
- `GET /events/replay` - Get events for replay

## Event Types

- `transaction_confirmed` - Transaction confirmation events
- `account_changed` - Account balance/data changes
- `program_log` - Program execution logs
- `cpi_invocation` - Cross-program invocation events
- `block_produced` - New block production
- `slot_updated` - Slot update notifications

## Usage Examples

### Monitor Account Changes
```typescript
// Start monitoring an account
await fetch('http://localhost:3000/events/monitor/account/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', {
  method: 'POST'
});

// WebSocket will receive events like:
{
  eventType: 'account_changed',
  data: {
    accountId: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    lamports: 1000000,
    owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
  },
  source: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
}
```

### Create Event Subscription
```typescript
const subscription = await fetch('http://localhost:3000/events/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: 'my-app',
    eventType: 'transaction_confirmed',
    subscriptionType: 'websocket',
    filters: {
      minAmount: 1000000 // Only transactions with > 1 SOL
    }
  })
});
```

### Event Filtering
```typescript
const filter = await fetch('http://localhost:3000/events/filters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ownerId: 'user123',
    filterType: 'transaction',
    criteria: {
      tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      minAmount: 1000
    },
    name: 'Large USDC Transfers',
    isPublic: true
  })
});
```

## Architecture

### Event Flow
1. **Blockchain Monitoring**: Automatic monitoring of Solana network
2. **Event Creation**: Events are created and persisted to database
3. **Filtering**: Events are matched against active filters
4. **Distribution**: Events are sent to subscribed clients via WebSocket/webhook/Kafka
5. **Persistence**: All events are stored for replay and analytics

### Subscription Types
- **WebSocket**: Real-time streaming to connected clients
- **Webhook**: HTTP callbacks to specified endpoints
- **Kafka**: Publishing to Kafka topics for stream processing

### Security Features
- Client authentication via clientId
- Subscription authorization and validation
- Rate limiting and connection management
- Secure WebSocket connections (WSS in production)
- Event data validation and sanitization

## Integration with Other Modules

### Transactions Module
- Automatic event creation for transaction confirmations
- Integration with existing Kafka publishing

### CPI Module
- Events for cross-program invocations
- Permission-based event filtering

### SVM Module
- Program execution events and logs
- Gas usage and performance metrics

This events module provides the foundation for real-time blockchain monitoring and enables building responsive, event-driven applications on Solana.