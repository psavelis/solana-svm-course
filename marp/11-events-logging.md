---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 11: Events & Logging'
footer: 'Solana SVM Architecture'
---

# Module 11: Events and Logging

## Real-Time Monitoring & Event Streaming

---

## Event-Driven Architecture

### Event System Overview
- **Real-Time Monitoring**: Live blockchain event streaming
- **WebSocket Integration**: Persistent client connections
- **Subscription Management**: Flexible event filtering and delivery
- **Comprehensive Logging**: Complete audit trail of all operations

### Key Capabilities
- **Blockchain Monitoring**: Program logs, account changes, slot updates
- **Event Filtering**: Advanced filtering and subscription rules
- **Real-Time Delivery**: WebSocket and webhook notifications
- **Historical Replay**: Event replay for state reconstruction

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             EventsController                        │   │
│  │  • POST /events → createEvent()                     │   │
│  │  • GET /events → getEvents()                        │   │
│  │  • PUT /events/:id → updateEvent()                  │   │
│  │  • GET /events/replay → getEventsForReplay()        │   │
│  │  • POST /events/subscriptions → createSubscription()│   │
│  │  • GET /events/subscriptions/:clientId → getSubscriptionsByClient()│   │
│  │  • PUT /events/subscriptions/:id → updateSubscription()│   │
│  │  • DELETE /events/subscriptions/:id → deleteSubscription()│   │
│  │  • POST /events/filters → createFilter()            │   │
│  │  • GET /events/filters/:ownerId → getFiltersByOwner()│   │
│  │  • GET /events/stats → getEventStats()              │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              EventsService                          │   │
│  │  • createEvent() → Event Creation                   │   │
│  │  • getEvents() → Event Querying                     │   │
│  │  • updateEvent() → Event Updates                    │   │
│  │  • startBlockchainMonitoring() → Blockchain Monitoring│   │
│  │  • handleProgramLogs() → Log Processing            │   │
│  │  • handleSlotUpdate() → Slot Monitoring             │   │
│  │  • handleAccountChange() → Account Monitoring       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        EventSubscriptionService                     │   │
│  │  • createSubscription() → Subscription Creation    │   │
│  │  • getSubscriptions() → Subscription Retrieval     │   │
│  │  • updateSubscription() → Subscription Updates     │   │
│  │  • deleteSubscription() → Subscription Removal     │   │
│  │  • notifySubscribers() → Event Notification        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           EventFilterService                        │   │
│  │  • createFilter() → Filter Creation                │   │
│  │  • getFilters() → Filter Retrieval                 │   │
│  │  • applyFilters() → Event Filtering                │   │
│  │  • matchesFilter() → Filter Matching               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Event Entities                         │   │
│  │  • Event: Core event data & metadata               │   │
│  │  • EventSubscription: Client subscriptions         │   │
│  │  • EventFilter: Advanced filtering rules           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             External Integrations                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             EventsGateway                            │   │
│  │  • handleConnection() → Client Connection           │   │
│  │  • handleDisconnect() → Client Disconnection        │   │
│  │  • @SubscribeMessage subscribe → Event Subscription │   │
│  │  • @SubscribeMessage unsubscribe → Event Unsubscription│   │
│  │  • emitEvent() → Event Broadcasting                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Solana Web3.js                          │   │
│  │  • onLogs() → Program Log Monitoring               │   │
│  │  • onSlotUpdate() → Slot Update Monitoring         │   │
│  │  • onAccountChange() → Account Change Monitoring   │   │
│  │  • onProgramAccountChange() → Program Account Monitoring│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Socket.IO Server                        │   │
│  │  • Namespace: /events → Event Namespace            │   │
│  │  • Rooms: client:{id} → Client-specific Rooms      │   │
│  │  • Real-time Events → Live Event Streaming         │   │
│  │  • Connection Management → Client Lifecycle        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Repository<Event> → Event storage                 │   │
│  │  • Repository<EventSubscription> → Subscription storage│   │
│  │  • Repository<EventFilter> → Filter storage          │   │
│  │  • Indexes: eventType, source, createdAt             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Event Types & Monitoring

### Supported Event Types
```typescript
enum EventType {
  TRANSACTION_CONFIRMED = 'TRANSACTION_CONFIRMED',
  ACCOUNT_CHANGED = 'ACCOUNT_CHANGED',
  PROGRAM_LOG = 'PROGRAM_LOG',
  CPI_INVOCATION = 'CPI_INVOCATION',
  BLOCK_PRODUCED = 'BLOCK_PRODUCED',
  SLOT_UPDATED = 'SLOT_UPDATED'
}
```

### Blockchain Monitoring Setup
```typescript
async startBlockchainMonitoring(): Promise<void> {
  // Program log monitoring
  this.connection.onLogs('all', (logs) => {
    this.handleProgramLogs(logs);
  });

  // Slot update monitoring
  this.connection.onSlotUpdate((slotUpdate) => {
    this.handleSlotUpdate(slotUpdate);
  });

  // Account change monitoring
  this.accountSubscriptions.forEach((accountId, subscriptionId) => {
    this.connection.onAccountChange(
      new PublicKey(accountId),
      (accountInfo) => {
        this.handleAccountChange(accountId, accountInfo);
      },
      'confirmed'
    );
  });
}
```

---

## Event Processing Pipeline

### Event Flow Architecture
```
1. 🔍 Event Detection → Blockchain Monitoring
2. 📝 Event Creation → createEvent()
3. 💾 Database Storage → Persistent Storage
4. 📡 WebSocket Emission → Real-time Broadcasting
5. 🎯 Subscription Filtering → Targeted Delivery
6. 🌐 Webhook Delivery → HTTP Callbacks
```

### Event Entity Structure
```typescript
@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EventType
  })
  eventType: EventType;

  @Column()
  source: string;  // Account/Program ID

  @Column('jsonb')
  data: any;       // Event payload

  @Column('bigint')
  slot: number;    // Solana slot number

  @Column({ nullable: true })
  signature?: string;  // Transaction signature

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.PENDING
  })
  status: EventStatus;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## Subscription Management

### WebSocket Gateway Implementation
```typescript
@WebSocketGateway({
  namespace: '/events',
  cors: true
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.clients.set(client.id, client);
    client.join(`client:${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, data: SubscribeDto) {
    // Create subscription
    const subscription = await this.subscriptionService.createSubscription({
      clientId: client.id,
      eventTypes: data.eventTypes,
      filters: data.filters
    });

    // Join subscription room
    client.join(`subscription:${subscription.id}`);
  }

  emitEvent(event: Event) {
    // Broadcast to all subscribers
    this.server.to('subscription:all').emit('event', event);
  }
}
```

### Subscription Entity
```typescript
@Entity()
export class EventSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;  // WebSocket client ID

  @Column('jsonb')
  eventTypes: EventType[];  // Subscribed event types

  @Column('jsonb', { nullable: true })
  filters?: any;     // Subscription filters

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  webhookUrl?: string;  // For HTTP callbacks

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## Advanced Event Filtering

### Filter System Architecture
```typescript
interface EventFilter {
  id: string;
  name: string;
  eventType: EventType;
  conditions: FilterCondition[];
  action: 'include' | 'exclude' | 'transform';
  isActive: boolean;
}

interface FilterCondition {
  field: string;        // Event field to check
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'regex';
  value: any;          // Comparison value
}
```

### Filter Application
```typescript
async applyFilters(event: Event): Promise<boolean> {
  const activeFilters = await this.filterRepository.find({
    where: { eventType: event.eventType, isActive: true }
  });

  for (const filter of activeFilters) {
    if (this.matchesFilter(event, filter)) {
      switch (filter.action) {
        case 'include':
          return true;
        case 'exclude':
          return false;
        case 'transform':
          // Apply transformation logic
          break;
      }
    }
  }

  return true; // Default: include event
}

matchesFilter(event: Event, filter: EventFilter): boolean {
  return filter.conditions.every(condition => {
    const fieldValue = this.getNestedProperty(event, condition.field);
    return this.evaluateCondition(fieldValue, condition.operator, condition.value);
  });
}
```

---

## Real-Time Features

### WebSocket Real-Time Streaming
- **Persistent Connections**: Long-lived client connections
- **Room-Based Messaging**: Targeted event broadcasting
- **Connection Recovery**: Automatic reconnection handling
- **Load Balancing**: Scalable WebSocket server architecture
- **Message Buffering**: Event queuing during network issues

### Real-Time Monitoring Capabilities
```typescript
// Account monitoring subscription
@Post('/monitor/account/:accountId')
async subscribeToAccount(
  @Param('accountId') accountId: string,
  @Body() subscription: AccountSubscriptionDto
): Promise<SubscriptionResult> {
  // Start monitoring account changes
  const subscriptionId = await this.connection.onAccountChange(
    new PublicKey(accountId),
    (accountInfo) => {
      this.eventsService.createEvent({
        eventType: EventType.ACCOUNT_CHANGED,
        source: accountId,
        data: accountInfo,
        slot: accountInfo.slot
      });
    },
    subscription.commitment || 'confirmed'
  );

  return { subscriptionId };
}
```

---

## Event Replay & Historical Analysis

### Event Replay Implementation
```typescript
async getEventsForReplay(replayDto: EventReplayDto): Promise<Event[]> {
  const query = this.eventRepository.createQueryBuilder('event');

  // Apply time range filter
  if (replayDto.startTime) {
    query.andWhere('event.createdAt >= :startTime', {
      startTime: replayDto.startTime
    });
  }

  if (replayDto.endTime) {
    query.andWhere('event.createdAt <= :endTime', {
      endTime: replayDto.endTime
    });
  }

  // Apply event type filter
  if (replayDto.eventTypes?.length) {
    query.andWhere('event.eventType IN (:...eventTypes)', {
      eventTypes: replayDto.eventTypes
    });
  }

  // Apply source filter
  if (replayDto.sources?.length) {
    query.andWhere('event.source IN (:...sources)', {
      sources: replayDto.sources
    });
  }

  return query.orderBy('event.createdAt', 'ASC').getMany();
}
```

### Historical Event Statistics
```typescript
async getEventStats(statsDto: EventStatsDto): Promise<EventStats> {
  const stats = await this.eventRepository
    .createQueryBuilder('event')
    .select([
      'COUNT(*) as totalEvents',
      'event.eventType',
      'COUNT(DISTINCT event.source) as uniqueSources',
      'AVG(EXTRACT(EPOCH FROM (NOW() - event.createdAt))) as avgAge'
    ])
    .where('event.createdAt >= :startDate', {
      startDate: statsDto.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
    })
    .groupBy('event.eventType')
    .getRawMany();

  return {
    totalEvents: stats.reduce((sum, s) => sum + parseInt(s.totalEvents), 0),
    eventsByType: stats,
    timeRange: statsDto
  };
}
```

---

## API Endpoints

### Event Management
- `POST /events` - Create custom event
- `GET /events` - Query events with filtering
- `PUT /events/:id` - Update event status
- `GET /events/replay` - Get events for replay

### Subscription Management
- `POST /events/subscriptions` - Create event subscription
- `GET /events/subscriptions/:clientId` - Get client subscriptions
- `PUT /events/subscriptions/:id` - Update subscription
- `DELETE /events/subscriptions/:id` - Remove subscription

### Filter Management
- `POST /events/filters` - Create event filter
- `GET /events/filters/:ownerId` - Get owner filters
- `PUT /events/filters/:id` - Update filter
- `DELETE /events/filters/:id` - Remove filter

### Monitoring
- `POST /events/monitor/account/:accountId` - Subscribe to account changes
- `DELETE /events/monitor/account/:accountId` - Unsubscribe from account
- `POST /events/monitor/program/:programId` - Subscribe to program accounts
- `GET /events/stats` - Get event statistics

---

## Key Takeaways

### Event System Benefits
- **Real-Time Monitoring**: Live blockchain event streaming
- **Flexible Subscriptions**: WebSocket and webhook delivery options
- **Advanced Filtering**: Granular event selection and processing
- **Historical Analysis**: Complete event replay and statistics

### SVM Event Advantages
- **High-Frequency Events**: Handle thousands of events per second
- **Parallel Processing**: Multiple event streams processed simultaneously
- **State Synchronization**: Real-time state updates across distributed systems
- **Audit Trail**: Immutable event history for compliance and debugging