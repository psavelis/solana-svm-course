---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 5: Fee Mechanism'
footer: 'Solana SVM Architecture'
---

# Module 5: Fee Mechanism

## Dynamic Fee Calculation & Optimization

---

## Solana Fee Structure

### Fee Components
- **Base Fee**: 5000 lamports per signature (fixed)
- **Priority Fee**: Variable fee for transaction ordering
- **Compute Unit Cost**: Based on program execution complexity

### Fee Market Dynamics
- **Network Congestion**: Higher fees during peak usage
- **Priority Levels**: Conservative to aggressive fee strategies
- **Historical Analysis**: Trend-based fee optimization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              FeeController                           │   │
│  │  • GET /fee/estimate → getFeeEstimate()             │   │
│  │  • POST /fee/recommendations → getFeeRecommendations()│   │
│  │  • GET /fee/market-stats → getFeeMarketStats()      │   │
│  │  • POST /fee/validate → validateFeeEstimate()       │   │
│  │  • POST /fee/optimize → optimizeFee()               │   │
│  │  • GET /fee/strategies → getAvailableStrategies()   │   │
│  │  • GET /fee/historical-analysis → getHistoricalFeeAnalysis()│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               FeeService                             │   │
│  │  • getFeeEstimate() ← API calls                     │   │
│  │  • getFeeRecommendations() ← API calls             │   │
│  │  • getFeeMarketStats() ← API calls                  │   │
│  │  • validateFeeEstimate() ← API calls               │   │
│  │  • estimateComputeUnits() ← Internal                │   │
│  │  • calculatePriorityFee() ← Internal               │   │
│  │  • getNetworkCongestion() ← Internal               │   │
│  │  • getRecentPriorityFees() ← Internal              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         FeeOptimizationService                      │   │
│  │  • optimizeFee() ← API calls                       │   │
│  │  • getAvailableStrategies() ← API calls            │   │
│  │  • getHistoricalFeeAnalysis() ← API calls          │   │
│  │  • strategies: FeeOptimizationStrategy[]           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             External Integrations                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Solana Web3.js                           │   │
│  │  • getRecentBlockhash() → Fee calculator data       │   │
│  │  • getConfirmedBlock() → Historical fee analysis    │   │
│  │  • getRecentPerformanceSamples() → Network congestion│   │
│  │  • Transaction.from() → Transaction deserialization │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Fee Data Structures

### FeeEstimate Interface
```typescript
interface FeeEstimate {
  baseFee: number;        // Lamports per signature (5000)
  priorityFee: number;    // Additional priority fee
  totalFee: number;       // Total estimated cost
  computeUnits: number;   // Estimated CU usage
  feePayer: string;       // Fee payer address
}
```

### FeeRecommendation Interface
```typescript
interface FeeRecommendation {
  conservative: FeeEstimate;  // Low risk option
  moderate: FeeEstimate;      // Balanced option
  aggressive: FeeEstimate;    // High priority option
  networkCongestion: 'low' | 'medium' | 'high';
  recentBlockhash: string;    // Current blockhash
}
```

---

## Priority Fee Levels

### Fee Multipliers
- **Min**: 0.1x multiplier (minimal priority)
- **Low**: 0.5x multiplier (reduced priority)
- **Medium**: 1.0x multiplier (standard priority)
- **High**: 2.0x multiplier (elevated priority)
- **Very High**: 5.0x multiplier (high priority)
- **Unsafe Max**: 10.0x multiplier (maximum priority)

### Strategy Selection
```typescript
enum FeeOptimizationStrategy {
  CONSERVATIVE = 'ConservativeStrategy',  // Minimize cost, accept delays
  BALANCED = 'BalancedStrategy',          // Balance cost vs speed
  AGGRESSIVE = 'AggressiveStrategy',      // Maximize speed, higher cost
  PREDICTIVE = 'PredictiveStrategy',      // Use historical patterns
  DYNAMIC = 'DynamicStrategy'             // Adapt to network conditions
}
```

---

## Compute Unit Estimation

### Program CU Costs
```typescript
const COMPUTE_UNIT_ESTIMATES = {
  'SystemProgram.transfer': 5000,
  'SystemProgram.createAccount': 10000,
  'SPL Token operations': 8000,
  'Other programs': 10000,  // Conservative estimate
  'Transaction overhead': 5000  // Minimum buffer
};
```

### Estimation Logic
```typescript
estimateComputeUnits(transaction: Transaction): number {
  let totalCU = 5000; // Transaction overhead

  for (const instruction of transaction.instructions) {
    const programId = instruction.programId.toString();

    if (programId === SystemProgram.programId.toString()) {
      // System program instructions
      if (instruction.data[0] === 2) { // Transfer
        totalCU += 5000;
      } else if (instruction.data[0] === 0) { // Create account
        totalCU += 10000;
      }
    } else if (programId === TOKEN_PROGRAM_ID.toString()) {
      totalCU += 8000; // SPL token operations
    } else {
      totalCU += 10000; // Conservative estimate
    }
  }

  return totalCU;
}
```

---

## Network Congestion Analysis

### Congestion Detection
```typescript
getNetworkCongestion(): 'low' | 'medium' | 'high' {
  const samples = await connection.getRecentPerformanceSamples(5);
  const avgTPS = samples.reduce((sum, s) => sum + s.numTransactions, 0) / samples.length;

  if (avgTPS > 5000) return 'high';
  if (avgTPS > 2000) return 'medium';
  return 'low';
}
```

### Fee Adjustment Based on Congestion
- **Low Congestion**: Base fees only
- **Medium Congestion**: 1.5x priority fee multiplier
- **High Congestion**: 3x priority fee multiplier

---

## Fee Optimization Strategies

### Strategy Implementations

#### Conservative Strategy
- **Goal**: Minimize cost, accept potential delays
- **Priority Fee**: 0.1x base rate
- **Success Rate**: ~60% inclusion in next block
- **Use Case**: Non-urgent transactions

#### Balanced Strategy
- **Goal**: Balance cost vs speed
- **Priority Fee**: 1.0x base rate
- **Success Rate**: ~85% inclusion in next block
- **Use Case**: Standard transaction priority

#### Aggressive Strategy
- **Goal**: Maximize speed, higher cost acceptable
- **Priority Fee**: 5.0x base rate
- **Success Rate**: ~95% inclusion in next block
- **Use Case**: Time-sensitive operations

---

## Historical Fee Analysis

### Trend Analysis
```typescript
interface HistoricalFeeAnalysis {
  averageFee: number;           // Mean fee over period
  feeVolatility: number;        // Standard deviation
  bestTimes: HourlyFeeAverage[]; // Optimal transaction times
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface HourlyFeeAverage {
  hour: number;     // 0-23
  averageFee: number;
  successRate: number;
}
```

### Predictive Optimization
- **Pattern Recognition**: Identify low-fee time windows
- **Volatility Analysis**: Adjust strategy based on fee stability
- **Trend Forecasting**: Predict optimal transaction timing
- **Dynamic Adaptation**: Real-time strategy switching

---

## API Endpoints

### Fee Estimation
- `GET /fee/estimate` - Get basic fee estimate for transaction
- `POST /fee/recommendations` - Get multi-level fee recommendations
- `GET /fee/market-stats` - Get current network fee statistics

### Fee Optimization
- `POST /fee/validate` - Validate a fee estimate
- `POST /fee/optimize` - Optimize fee using selected strategy
- `GET /fee/strategies` - List available optimization strategies
- `GET /fee/historical-analysis` - Get historical fee trend analysis

---

## Implementation Example

### Complete Fee Estimation Flow
```typescript
async getFeeEstimate(transaction: Transaction): Promise<FeeEstimate> {
  // Estimate compute units
  const computeUnits = this.estimateComputeUnits(transaction);

  // Get network congestion
  const congestion = await this.getNetworkCongestion();

  // Calculate base fee (5000 lamports per signature)
  const signatures = transaction.signatures.length || 1;
  const baseFee = signatures * 5000;

  // Calculate priority fee based on congestion
  const priorityMultiplier = congestion === 'high' ? 3.0 :
                            congestion === 'medium' ? 1.5 : 1.0;
  const priorityFee = Math.floor(baseFee * priorityMultiplier);

  return {
    baseFee,
    priorityFee,
    totalFee: baseFee + priorityFee,
    computeUnits,
    feePayer: transaction.feePayer?.toString() || ''
  };
}
```

---

## Key Takeaways

### Fee Mechanism Benefits
- **Cost Efficiency**: Dynamic fee calculation prevents overpayment
- **Priority Control**: Strategic fee setting for transaction ordering
- **Network Awareness**: Congestion-based fee adjustments
- **Historical Optimization**: Data-driven fee strategy selection

### SVM Fee Advantages
- **Predictable Base Fees**: Fixed 5000 lamports per signature
- **Priority Fee Flexibility**: Variable fees for transaction ordering
- **Compute Unit Pricing**: Pay for actual resource usage
- **High Throughput**: Efficient fee market at scale