# Database Connection Pooling

This module implements in-depth database connection pooling for PostgreSQL with monitoring, health checks, and performance optimization. It provides stable and reliable connection management with detailed metrics and administrative controls.

## Features

- **Connection Pooling**: Efficient connection reuse with configurable pool sizes
- **Health Monitoring**: Real-time health checks and connection status
- **Performance Metrics**: Detailed pool statistics and utilization tracking
- **Automatic Management**: Connection lifecycle management with timeouts
- **Administrative Controls**: Manual pool management and maintenance operations
- **Transaction Support**: Safe transaction execution with proper connection handling

## Pool Configuration

The connection pool is configured through environment variables:

```env
# Pool Size Configuration
DB_POOL_MIN=2                    # Minimum connections to maintain
DB_POOL_MAX=20                   # Maximum connections allowed
DB_POOL_IDLE_TIMEOUT=30000       # Idle connection timeout (30 seconds)
DB_POOL_ACQUIRE_TIMEOUT=60000    # Connection acquisition timeout (60 seconds)
DB_POOL_CONNECTION_TIMEOUT=10000 # Connection establishment timeout (10 seconds)

# Retry Configuration
DB_RETRY_ATTEMPTS=3              # Number of retry attempts
DB_RETRY_DELAY=1000              # Delay between retries (1 second)
```

### Pool Size Guidelines

- **Minimum Connections (DB_POOL_MIN)**: Set to 2 for basic applications, higher for high-traffic apps
- **Maximum Connections (DB_POOL_MAX)**: Based on database server capacity and application needs
- **Idle Timeout**: Balance between keeping connections warm and resource usage
- **Acquire Timeout**: Should be higher than typical query execution time

## API Endpoints

### Health Status
```http
GET /database/health
```

**Response:**
```json
{
  "status": "healthy",
  "connectionCount": 10,
  "activeConnections": 5,
  "idleConnections": 5,
  "waitingClients": 2,
  "totalCount": 10,
  "idleCount": 5,
  "waitingCount": 2,
  "lastChecked": "2025-12-29T10:30:00.000Z",
  "uptime": 3600000,
  "poolConfig": {
    "min": 2,
    "max": 20,
    "idleTimeoutMillis": 30000,
    "acquireTimeoutMillis": 60000
  }
}
```

### Pool Statistics
```http
GET /database/pool/stats
```

**Response:**
```json
{
  "totalConnections": 10,
  "activeConnections": 5,
  "idleConnections": 5,
  "waitingClients": 2,
  "utilizationRate": 50.0,
  "poolConfig": {
    "min": 2,
    "max": 20,
    "idleTimeoutMillis": 30000,
    "acquireTimeoutMillis": 60000
  }
}
```

### Connection Information
```http
GET /database/info
```

**Response:**
```json
{
  "name": "default",
  "type": "postgres",
  "host": "localhost",
  "port": 5432,
  "database": "solana_study",
  "isConnected": true,
  "entities": ["Account", "Transaction", "Token"]
}
```

### Manual Health Check
```http
GET /database/health/check
```

**Response:**
```json
{
  "healthy": true,
  "timestamp": "2025-12-29T10:30:00.000Z"
}
```

### Connection Count
```http
GET /database/connections/count
```

**Response:**
```json
{
  "connectionCount": 10,
  "timestamp": "2025-12-29T10:30:00.000Z"
}
```

### Close Idle Connections
```http
POST /database/pool/close-idle
```

**Response:**
```json
{
  "message": "Idle connections closed",
  "timestamp": "2025-12-29T10:30:00.000Z"
}
```

## Monitoring and Health Checks

### Automatic Health Monitoring
- **Periodic Checks**: Health checks run every 30 seconds automatically
- **Connection Validation**: Simple queries verify database connectivity
- **Logging**: Health status changes are logged for monitoring

### Health Status Indicators
- **Status**: `healthy` or `unhealthy`
- **Connection Metrics**: Active, idle, and waiting connection counts
- **Performance Data**: Pool utilization rates and configuration
- **Uptime Tracking**: Service uptime since initialization

### Pool Utilization Monitoring
- **Utilization Rate**: Percentage of pool capacity in use
- **Waiting Clients**: Number of requests waiting for connections
- **Connection Distribution**: Balance between active and idle connections

## Usage Examples

### Using the Connection Service

```typescript
import { DatabaseConnectionService } from './database/database-connection.service';

@Injectable()
export class MyService {
  constructor(
    private readonly dbConnection: DatabaseConnectionService,
  ) {}

  async getData() {
    // Execute a simple query
    const result = await this.dbConnection.executeQuery(
      'SELECT * FROM accounts WHERE id = $1',
      [accountId]
    );

    return result;
  }

  async createTransaction(accountId: string, amount: number) {
    // Execute within a transaction
    return this.dbConnection.executeTransaction(async (manager) => {
      // Perform multiple operations atomically
      const account = await manager.findOne(Account, { id: accountId });
      const transaction = await manager.save(Transaction, {
        accountId,
        amount,
        status: TransactionStatus.PENDING,
      });

      return transaction;
    });
  }
}
```

### Health Check Integration

```typescript
import { DatabaseConnectionService } from './database/database-connection.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly dbConnection: DatabaseConnectionService,
  ) {}

  async checkDatabaseHealth() {
    const health = await this.dbConnection.getHealthStatus();
    const poolStats = await this.dbConnection.getPoolStats();

    return {
      database: health.status,
      poolUtilization: poolStats.utilizationRate,
      activeConnections: poolStats.activeConnections,
    };
  }
}
```

## Performance Optimization

### Pool Size Tuning
- **Start Small**: Begin with conservative pool sizes and monitor usage
- **Scale Gradually**: Increase max connections based on observed load
- **Monitor Always**: Use the `/database/pool/stats` endpoint to track utilization

### Connection Timeout Configuration
- **Idle Timeout**: Balance between connection reuse and resource cleanup
- **Acquire Timeout**: Set higher than your slowest expected queries
- **Connection Timeout**: Keep low to fail fast on network issues

### Query Optimization
- **Connection Reuse**: Pool automatically handles connection reuse
- **Transaction Scoping**: Use transactions for multi-statement operations
- **Query Batching**: Group related operations to minimize round trips

## Troubleshooting

### Common Issues

#### High Connection Utilization
```
Symptom: utilizationRate > 80%
Solution: Increase DB_POOL_MAX or optimize query performance
```

#### Connection Timeouts
```
Symptom: Acquire timeout errors
Solution: Increase DB_POOL_ACQUIRE_TIMEOUT or reduce query complexity
```

#### Idle Connection Accumulation
```
Symptom: High idleConnections count
Solution: Adjust DB_POOL_IDLE_TIMEOUT or use /database/pool/close-idle
```

### Monitoring Queries

```sql
-- Check active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE datname = 'solana_study';

-- Check connection pool status (application level)
-- Use the /database/health endpoint
```

## Security Considerations

- **Connection Limits**: Pool max prevents connection exhaustion attacks
- **Timeout Protection**: Prevents hanging connections from resource exhaustion
- **Credential Security**: Database credentials managed through environment variables
- **Access Control**: API endpoints should be protected in production

## Production Deployment

### Environment Configuration
```env
# Production pool settings
DB_POOL_MIN=5
DB_POOL_MAX=50
DB_POOL_IDLE_TIMEOUT=60000
DB_POOL_ACQUIRE_TIMEOUT=300000

# Database server settings
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USERNAME=your-db-user
DB_PASSWORD=your-secure-password
DB_DATABASE=your-production-db
```

### Health Check Integration
Integrate with your monitoring system:

```typescript
// Example: Prometheus metrics
const health = await dbConnection.getHealthStatus();
registry.registerMetric({
  name: 'db_connections_active',
  type: 'gauge',
  value: health.activeConnections,
});

registry.registerMetric({
  name: 'db_pool_utilization',
  type: 'gauge',
  value: (health.activeConnections / health.totalCount) * 100,
});
```

## Dependencies

- `@nestjs/common`: NestJS framework
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM with connection pooling
- `pg`: PostgreSQL driver with pool support

## Future Enhancements

- **Connection Pool Metrics**: Integration with Prometheus/Grafana
- **Circuit Breaker**: Automatic failover for database issues
- **Read Replicas**: Support for read/write splitting
- **Connection Encryption**: SSL/TLS configuration
- **Advanced Monitoring**: Query performance and slow query detection