# Fee Estimation Service

This module provides in-depth fee estimation and optimization services for Solana transactions, implementing both base fees and priority fees similar to EVM's EIP-1559 mechanism.

## Features

- **Fee Estimation**: Calculate base fees and priority fees for transactions
- **Priority Levels**: Support for conservative, moderate, and aggressive fee strategies
- **Network Analysis**: Real-time network congestion detection
- **Compute Unit Estimation**: Automatic estimation based on transaction instructions
- **Market Statistics**: Current fee market analysis and trends
- **Fee Validation**: Ensure fee estimates are reasonable and secure

## Fee Mechanism Comparison

| Aspect | Solana | EVM (EIP-1559) |
|--------|--------|----------------|
| Base Fee | Lamports per signature | Gas price floor |
| Priority Fee | Additional compute unit cost | Priority fee (tip) |
| Congestion | Block utilization | Base fee adjustment |
| Limits | Compute unit budget | Gas limit |

## API Endpoints

### Get Basic Fee Estimate
```http
GET /fee/estimate?transactionData=<base64-encoded-transaction>
```

**Response:**
```json
{
  "baseFee": 5000,
  "priorityFee": 250,
  "totalFee": 5250,
  "computeUnits": 5000,
  "feePayer": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH"
}
```

### Get Fee Recommendations
```http
POST /fee/recommendations
Content-Type: application/json

{
  "transactionData": "base64-encoded-transaction",
  "priorityLevel": "medium",
  "includeVotes": false
}
```

**Response:**
```json
{
  "conservative": {
    "baseFee": 5000,
    "priorityFee": 125,
    "totalFee": 5125,
    "computeUnits": 5000,
    "feePayer": ""
  },
  "moderate": {
    "baseFee": 5000,
    "priorityFee": 250,
    "totalFee": 5250,
    "computeUnits": 5000,
    "feePayer": ""
  },
  "aggressive": {
    "baseFee": 5000,
    "priorityFee": 500,
    "totalFee": 5500,
    "computeUnits": 5000,
    "feePayer": ""
  },
  "networkCongestion": "medium",
  "recentBlockhash": "8sM8K7mJ5...blockhash"
}
```

### Get Fee Market Statistics
```http
GET /fee/market-stats
```

**Response:**
```json
{
  "averageFee": 0.000002,
  "medianFee": 0.0000015,
  "percentile95": 0.000003,
  "networkLoad": 0.6,
  "recommendedBaseFee": 5000
}
```

### Validate Fee Estimate
```http
POST /fee/validate
Content-Type: application/json

{
  "baseFee": 5000,
  "priorityFee": 1000,
  "totalFee": 6000,
  "computeUnits": 5000,
  "feePayer": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH"
}
```

**Response:** `true` or `false`

### Optimize Fee (Advanced)
```http
POST /fee/optimize
Content-Type: application/json

{
  "transactionData": "base64-encoded-transaction",
  "userPreferences": {
    "speed": "normal",
    "riskTolerance": "moderate",
    "maxFeeLamports": 10000,
    "targetSuccessRate": 0.95
  }
}
```

**Response:**
```json
{
  "optimalFee": {
    "recommendedFee": {
      "baseFee": 5000,
      "priorityFee": 750,
      "totalFee": 5750,
      "computeUnits": 5000,
      "feePayer": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH"
    },
    "strategy": "balanced",
    "confidence": 0.85,
    "estimatedSuccessRate": 0.92,
    "estimatedConfirmationTime": 45,
    "alternativeOptions": [...],
    "reasoning": [
      "Uses moderate fee multipliers based on network conditions",
      "Balances cost and confirmation time",
      "Good default choice for most transactions"
    ]
  },
  "alternatives": [...],
  "networkAnalysis": {
    "congestion": "medium",
    "recentBlockTime": 1703123456,
    "priorityFeePercentile": 0.000002,
    "networkLoad": 0.6,
    "recentTransactionSuccessRate": 0.94
  },
  "recommendations": [
    "Network activity is moderate. Current fee levels should provide reasonable confirmation times."
  ]
}
```

### Get Available Strategies
```http
GET /fee/strategies
```

**Response:**
```json
[
  {
    "name": "conservative",
    "description": "Prioritizes transaction success with higher fees for reliability"
  },
  {
    "name": "balanced",
    "description": "Balances cost efficiency with reasonable confirmation times"
  },
  {
    "name": "aggressive",
    "description": "Uses higher fees for fastest possible confirmation"
  },
  {
    "name": "predictive",
    "description": "Uses historical patterns to predict optimal fees"
  },
  {
    "name": "adaptive",
    "description": "Adapts fees based on recent transaction success/failure patterns"
  }
]
```

### Get Historical Fee Analysis
```http
GET /fee/historical-analysis?hours=24
```

**Response:**
```json
{
  "averageFee": 0.0000015,
  "feeVolatility": 0.25,
  "bestTimes": [
    {
      "hour": 3,
      "averageFee": 0.0000008
    },
    {
      "hour": 15,
      "averageFee": 0.0000012
    }
  ],
  "trend": "stable"
}
```

- **min**: Minimal priority (0.1x multiplier)
- **low**: Low priority (0.5x multiplier)
- **medium**: Standard priority (1x multiplier) - *recommended*
- **high**: High priority (2x multiplier)
- **veryHigh**: Very high priority (5x multiplier)
- **unsafeMax**: Maximum priority (10x multiplier) - *use with caution*

## Compute Unit Estimation

The service automatically estimates compute units based on transaction instructions:

| Instruction Type | Compute Units |
|------------------|---------------|
| SOL Transfer | 5,000 |
| Account Creation | 10,000 |
| Token Operations | 8,000 |
| Program Interactions | 10,000+ |
| Default | 5,000 |

## Network Congestion Levels

- **low**: < 2,000 TPS average
- **medium**: 2,000 - 5,000 TPS average
- **high**: > 5,000 TPS average

## Usage Examples

### Basic Fee Estimation
```typescript
import { FeeService } from './fee/fee.service';

const feeService = new FeeService();
const estimate = await feeService.getFeeEstimate(transaction);
console.log(`Total fee: ${estimate.totalFee} lamports`);
```

### Advanced Recommendations
```typescript
const recommendations = await feeService.getFeeRecommendations(
  transaction,
  { priorityLevel: 'high' }
);

console.log(`Recommended fee: ${recommendations.moderate.totalFee} lamports`);
console.log(`Network congestion: ${recommendations.networkCongestion}`);
```

### Market Analysis
```typescript
const stats = await feeService.getFeeMarketStats();
console.log(`Current network load: ${(stats.networkLoad * 100).toFixed(1)}%`);
```

## Security Considerations

- **Fee Limits**: Maximum total fee capped at 0.1 SOL to prevent excessive spending
- **Validation**: All fee estimates are validated for reasonableness
- **Network Safety**: Graceful handling of network failures and API errors
- **Rate Limiting**: Consider implementing rate limiting for public endpoints

## Testing

The service includes in-depth unit tests covering:
- Fee calculation algorithms
- Network congestion detection
- Compute unit estimation
- Fee validation logic
- Error handling scenarios

Run tests with:
```bash
npm test -- --testPathPattern=fee.service.spec.ts
```

## Dependencies

- `@solana/web3.js`: Solana Web3 library for network interaction
- `@nestjs/common`: NestJS framework
- `class-validator`: Request validation

## Future Enhancements

- **Dynamic Fee Adjustment**: Real-time fee optimization based on transaction success rates
- **Historical Analysis**: Long-term fee trend analysis
- **Cross-Program Optimization**: Fee optimization for complex CPI transactions
- **MEV Protection**: Fee strategies to avoid Miner Extractable Value