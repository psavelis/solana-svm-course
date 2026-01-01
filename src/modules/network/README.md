# RPC Endpoint Rotation and Failover

This module implements intelligent RPC endpoint rotation and automatic failover for Solana blockchain connections.

## Features

- **Multiple RPC Endpoints**: Support for multiple RPC endpoints per network with priority-based selection
- **Health Monitoring**: Continuous health checks for all endpoints with configurable intervals
- **Automatic Failover**: Seamless switching to healthy endpoints when primary endpoints fail
- **Load Balancing**: Priority-based endpoint selection for optimal performance
- **Comprehensive Monitoring**: Detailed health status and endpoint information

## Supported Networks

### Mainnet Beta
- **Official Mainnet** (Primary): `https://api.mainnet-beta.solana.com`
- **Project Serum**: `https://solana-api.projectserum.com`
- **Ankr**: `https://rpc.ankr.com/solana`
- **GenesysGo**: `https://ssc-dao.genesysgo.net`

### Devnet
- **Official Devnet** (Primary): `https://api.devnet.solana.com`
- **Devnet Fallback**: `https://devnet.solana.com`

### Testnet
- **Official Testnet** (Primary): `https://api.testnet.solana.com`

## Configuration

### Environment Variables
- `SOLANA_NETWORK`: Default network (`devnet`, `testnet`, `mainnet-beta`)
- `HEALTH_CHECK_INTERVAL`: Health check interval in milliseconds (default: 30000)
- `MAX_CONSECUTIVE_FAILURES`: Maximum failures before marking endpoint unhealthy (default: 3)

### Endpoint Configuration
Each endpoint includes:
- `url`: RPC endpoint URL
- `name`: Human-readable name
- `priority`: Selection priority (lower = higher priority)
- `isHealthy`: Current health status
- `consecutiveFailures`: Number of consecutive failures

## API Endpoints

### Network Management
- `GET /network/current` - Get current network and configuration
- `POST /network/switch` - Switch to different network
- `GET /network/available` - List all available networks

### Health Monitoring
- `GET /network/health` - Get current network health
- `GET /network/health/:network` - Get specific network health
- `GET /network/health/all` - Get all networks health

### RPC Endpoints
- `GET /network/endpoints` - Get current network RPC endpoints
- `GET /network/endpoints/:network` - Get specific network RPC endpoints
- `GET /network/config/:network` - Get network configuration

## Health Check Algorithm

1. **Periodic Checks**: Health checks run every 30 seconds by default
2. **Version Validation**: Uses `getVersion()` RPC call to verify endpoint health
3. **Failure Tracking**: Tracks consecutive failures per endpoint
4. **Automatic Recovery**: Unhealthy endpoints are automatically retried
5. **Priority Selection**: Always selects highest priority healthy endpoint

## Failover Behavior

- **Automatic Switching**: When primary endpoint fails, automatically switches to next healthy endpoint
- **No Service Interruption**: Connection requests always return a healthy endpoint
- **Logging**: All failover events are logged with detailed information
- **Recovery**: Failed endpoints are continuously monitored for recovery

## Monitoring Integration

The RPC endpoint health is integrated with the monitoring stack:
- **Prometheus Metrics**: Endpoint health status exposed as metrics
- **Grafana Dashboards**: Visual representation of endpoint health
- **Alerting**: Alerts triggered when all endpoints for a network are unhealthy

## Usage Example

```typescript
// Get a healthy connection (automatic failover)
const connection = networkService.getConnection();

// Check current network health
const health = await networkService.getNetworkHealth();

// Get all endpoint details
const endpoints = networkService.getRpcEndpoints();
```

## Error Handling

- **No Healthy Endpoints**: Throws error when no healthy endpoints available
- **Network Not Supported**: Throws error for unsupported networks
- **Connection Timeouts**: Configurable timeouts with automatic retry

## Security Considerations

- **Endpoint Validation**: All endpoints are validated before use
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Monitoring**: All endpoint usage is logged and monitored
- **Failover Limits**: Prevents rapid switching between unhealthy endpoints