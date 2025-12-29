# Database Performance Optimization

This module provides in-depth database performance monitoring, analysis, and optimization tools for PostgreSQL. It includes advanced indexing strategies, performance metrics, and optimization recommendations.

## Features

- **Advanced Indexing**: Composite, partial, and time-based indexes for optimal query performance
- **Performance Monitoring**: Real-time index usage statistics and table metrics
- **Query Analysis**: Performance analysis tools for individual queries
- **Optimization Recommendations**: Automated suggestions for database improvements
- **Configuration Guidance**: Best practices for PostgreSQL configuration

## Index Optimization Strategy

The system implements a multi-layered indexing approach:

### 1. Composite Indexes
Multi-column indexes for common query patterns:

```sql
-- Status + timestamp for recent transactions by status
CREATE INDEX idx_transactions_status_created_at ON transactions (status, created_at);

-- Type + status for filtering operations
CREATE INDEX idx_transactions_type_status ON transactions (type, status);

-- Address + timestamp for account history queries
CREATE INDEX idx_transactions_from_address_created_at ON transactions (from_address, created_at);
```

### 2. Partial Indexes
Conditional indexes for specific data subsets:

```sql
-- Only pending transactions (high-frequency queries)
CREATE INDEX idx_transactions_pending_only ON transactions (created_at)
WHERE status = 'pending';

-- Only failed transactions (error analysis)
CREATE INDEX idx_transactions_failed_only ON transactions (created_at)
WHERE status = 'failed';

-- Only PDA accounts
CREATE INDEX idx_accounts_pda_only ON accounts (program_id, created_at)
WHERE is_pda = true;
```

### 3. Time-Based Indexes
Optimized indexes for recent data queries:

```sql
-- Recent transactions (last 30 days)
CREATE INDEX idx_transactions_recent ON transactions (created_at)
WHERE created_at > NOW() - INTERVAL '30 days';

-- Recent accounts
CREATE INDEX idx_accounts_recent ON accounts (created_at)
WHERE created_at > NOW() - INTERVAL '30 days';
```

## API Endpoints

### Performance Report
```http
GET /database/performance/report
```

**Response:**
```json
{
  "indexStats": [
    {
      "indexName": "idx_transactions_status_created_at",
      "tableName": "transactions",
      "columnNames": ["status", "created_at"],
      "indexSize": 1048576,
      "usageCount": 150,
      "lastUsed": null,
      "isUsed": true
    }
  ],
  "slowQueries": [],
  "tableStats": [
    {
      "tableName": "transactions",
      "rowCount": 10000,
      "tableSize": 5242880,
      "indexSize": 2097152
    }
  ],
  "recommendations": [
    "Consider partitioning large tables: transactions",
    "High index-to-table ratio for transactions (40.0%). Consider index optimization.",
    "Consider running ANALYZE on tables after bulk operations"
  ],
  "generatedAt": "2025-12-29T11:30:00.000Z"
}
```

### Configuration Recommendations
```http
GET /database/performance/config/recommendations
```

**Response:**
```json
{
  "recommendations": [
    "Set work_mem appropriately for your query complexity (16-64MB)",
    "Configure maintenance_work_mem for index creation (256MB+)",
    "Set shared_buffers to 25% of available RAM",
    "Enable autovacuum and monitor its performance"
  ],
  "timestamp": "2025-12-29T11:30:00.000Z"
}
```

### Index Recommendations
```http
GET /database/performance/index/recommendations
```

**Response:**
```json
{
  "recommendations": [
    "Create composite indexes for multi-column WHERE clauses",
    "Consider partial indexes for status-based queries",
    "Add indexes on foreign key columns",
    "Use covering indexes for SELECT queries with specific columns"
  ],
  "timestamp": "2025-12-29T11:30:00.000Z"
}
```

### Query Analysis
```http
POST /database/performance/query/analyze
Content-Type: application/json

{
  "query": "SELECT * FROM transactions WHERE status = ? AND created_at > ?",
  "params": ["pending", "2025-01-01"]
}
```

**Response:**
```json
{
  "analysis": {
    "query": "SELECT * FROM transactions WHERE status = ? AND created_at > ?",
    "executionTime": 45,
    "rowsAffected": 150,
    "timestamp": "2025-12-29T11:30:00.000Z"
  },
  "timestamp": "2025-12-29T11:30:00.000Z"
}
```

## Index Usage Analysis

### Monitoring Index Effectiveness
The system tracks index usage statistics:

- **Usage Count**: Number of times index has been scanned
- **Index Size**: Disk space consumed by the index
- **Last Used**: Timestamp of last index usage (when available)
- **Is Used**: Boolean indicating if index is actively used

### Identifying Unused Indexes
```typescript
const report = await performanceService.getPerformanceReport();
const unusedIndexes = report.indexStats.filter(idx => !idx.isUsed);

// Log recommendations for removal
unusedIndexes.forEach(idx => {
  console.log(`Consider removing unused index: ${idx.indexName}`);
});
```

## Query Performance Optimization

### Analyzing Slow Queries
```typescript
const analysis = await performanceService.analyzeQuery(
  'SELECT * FROM transactions WHERE status = $1',
  ['pending']
);

if (analysis.executionTime > 1000) { // > 1 second
  console.log('Slow query detected:', analysis.query);
}
```

### Index Selection Strategy
1. **Single Column**: For simple equality/lookup queries
2. **Composite**: For multi-column WHERE clauses
3. **Partial**: For queries on specific data subsets
4. **Covering**: When index contains all required columns

## PostgreSQL Configuration

### Memory Settings
```sql
-- Work memory per connection (16-64MB)
SET work_mem = '32MB';

-- Maintenance operations memory (256MB+)
SET maintenance_work_mem = '512MB';

-- Shared buffers (25% of RAM)
SET shared_buffers = '1GB';
```

### Autovacuum Configuration
```sql
-- Enable autovacuum
ALTER SYSTEM SET autovacuum = on;

-- Vacuum thresholds
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.02;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.01;
```

### Checkpoint Settings
```sql
-- Checkpoint segments (PostgreSQL < 9.5)
ALTER SYSTEM SET checkpoint_segments = 32;

-- Or use automatic tuning (PostgreSQL 9.5+)
ALTER SYSTEM SET max_wal_size = '1GB';
ALTER SYSTEM SET min_wal_size = '80MB';
```

## Index Maintenance

### Monitoring Index Bloat
```sql
SELECT
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(n_dead_tup::float / (n_live_tup + n_dead_tup) * 100, 2) as bloat_ratio
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY bloat_ratio DESC;
```

### Reindexing Strategy
```sql
-- Reindex specific index
REINDEX INDEX CONCURRENTLY idx_transactions_status_created_at;

-- Reindex entire table
REINDEX TABLE CONCURRENTLY transactions;

-- Reindex entire database
REINDEX DATABASE CONCURRENTLY solana_study;
```

## Performance Monitoring

### Key Metrics to Monitor
- **Index Hit Rate**: `(idx_blks_hit / (idx_blks_hit + idx_blks_read)) * 100`
- **Table Bloat**: Ratio of dead to live tuples
- **Cache Hit Rate**: `(blks_hit / (blks_hit + blks_read)) * 100`
- **Active Connections**: Current connection count vs pool limits

### Automated Monitoring
```typescript
// Periodic performance checks
setInterval(async () => {
  const report = await performanceService.getPerformanceReport();

  // Alert on high index bloat
  report.tableStats.forEach(table => {
    if (table.bloatRatio > 0.2) { // 20% bloat
      console.warn(`High bloat detected on ${table.tableName}`);
    }
  });

  // Alert on unused indexes
  const unusedIndexes = report.indexStats.filter(idx => !idx.isUsed);
  if (unusedIndexes.length > 5) {
    console.warn(`${unusedIndexes.length} unused indexes detected`);
  }
}, 3600000); // Check hourly
```

## Optimization Best Practices

### Index Creation Guidelines
1. **Analyze Query Patterns**: Understand common WHERE clauses and JOIN conditions
2. **Start Small**: Create targeted indexes and monitor usage
3. **Monitor Impact**: Track query performance before/after index creation
4. **Regular Maintenance**: Reindex and analyze tables periodically

### Query Optimization
1. **Use EXPLAIN ANALYZE**: Understand query execution plans
2. **Avoid SELECT *** : Specify only required columns
3. **Use LIMIT**: For large result sets
4. **Consider Partitioning**: For time-series or large tables

### Maintenance Tasks
1. **Regular VACUUM**: Remove dead tuples and update statistics
2. **ANALYZE**: Update table statistics for query planner
3. **REINDEX**: Rebuild bloated indexes
4. **Monitor Growth**: Track table and index size over time

## Troubleshooting

### Common Performance Issues

#### Slow Queries
```
Symptoms: High execution time, timeouts
Solutions:
- Check query execution plan with EXPLAIN ANALYZE
- Verify appropriate indexes exist
- Consider query rewriting
- Check for table bloat
```

#### High Connection Count
```
Symptoms: Connection pool exhaustion
Solutions:
- Increase pool size if appropriate
- Optimize query performance to reduce execution time
- Implement connection pooling at application level
- Check for connection leaks
```

#### Index Bloat
```
Symptoms: Large index sizes, slow queries
Solutions:
- Run REINDEX on bloated indexes
- Adjust autovacuum settings
- Consider index recreation during maintenance windows
```

## Integration with Monitoring

### Prometheus Metrics
```typescript
// Export performance metrics
const report = await performanceService.getPerformanceReport();

// Index usage
registry.registerMetric({
  name: 'db_index_usage_total',
  type: 'counter',
  value: report.indexStats.reduce((sum, idx) => sum + idx.usageCount, 0),
});

// Table sizes
report.tableStats.forEach(table => {
  registry.registerMetric({
    name: 'db_table_size_bytes',
    type: 'gauge',
    value: table.tableSize,
    labels: { table: table.tableName },
  });
});
```

## Future Enhancements

- **Automated Index Recommendations**: AI-powered index suggestions
- **Query Plan Analysis**: Detailed execution plan parsing
- **Performance Baselines**: Historical performance tracking
- **Anomaly Detection**: Automatic performance issue alerts
- **Index Usage Forecasting**: Predictive index optimization

## Dependencies

- `@nestjs/common`: NestJS framework
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM with migration support
- `pg`: PostgreSQL driver

## Migration Execution

Run the performance indexes migration:

```bash
npm run migration:run
```

This will create all the advanced indexes for optimal query performance.