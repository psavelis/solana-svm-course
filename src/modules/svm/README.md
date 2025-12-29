# SVM Module

This module implements **Run 9** in the Solana SVM study course, demonstrating SVM (Solana Virtual Machine) integration with parallel transaction execution, runtime architecture, program compilation and deployment, and gas metering concepts.

## Overview

The SVM module provides in-depth Solana Virtual Machine functionality including:

- **Program Management**: Deploy, manage, and execute Solana programs
- **Runtime Execution**: Single and parallel program execution with gas metering
- **Gas Metering**: Resource usage tracking and limits for programs and accounts
- **Runtime Architecture**: SVM execution environment monitoring and statistics

## Key Concepts

### 1. Parallel Transaction Execution
- Execute multiple program instructions concurrently
- Optimized for Solana's parallel processing capabilities
- Maintains transaction atomicity and ordering

### 2. Runtime Architecture
- Sealevel runtime integration
- Program execution environment
- Compute budget management
- Resource allocation and monitoring

### 3. Program Compilation and Deployment
- Program bytecode management
- Deployment to Solana network
- Version control and upgrades
- Program state tracking

### 4. Gas Metering and Resource Limits
- Compute unit tracking
- Gas cost calculation
- Resource usage limits
- Efficiency monitoring

## API Endpoints

### Program Management
- `POST /svm/programs` - Create a new program
- `GET /svm/programs/:id` - Get program by ID
- `GET /svm/programs` - Query programs with filters
- `PUT /svm/programs/:id` - Update program
- `DELETE /svm/programs/:id` - Delete program
- `POST /svm/programs/:id/deploy` - Deploy program to Solana

### Runtime Execution
- `POST /svm/execute` - Execute a single program instruction
- `POST /svm/execute/parallel` - Execute multiple programs in parallel
- `GET /svm/executions/:id` - Get execution by ID
- `GET /svm/executions` - Query executions with filters
- `GET /svm/metrics/executions` - Get execution metrics

### Gas Metering
- `POST /svm/gas-meters` - Create a gas meter
- `GET /svm/gas-meters/:id` - Get gas meter by ID
- `GET /svm/gas-meters` - Query gas meters with filters
- `PUT /svm/gas-meters/:id` - Update gas meter
- `DELETE /svm/gas-meters/:id` - Delete gas meter
- `POST /svm/gas-meters/:id/consume` - Consume gas from meter
- `POST /svm/gas-meters/:id/reset` - Reset gas meter

### Utilities
- `GET /svm/runtime/info` - Get SVM runtime information
- `GET /svm/programs/:programId/stats` - Get program execution statistics

## Database Schema

### Programs Table
- Program metadata, bytecode, and deployment information
- Status tracking (deploying, active, suspended, deprecated)
- Owner and version management

### Runtime Executions Table
- Execution tracking with status and performance metrics
- Gas usage, compute units, and execution time
- Transaction IDs and block information

### Gas Meters Table
- Resource usage tracking and limits
- Configurable thresholds and auto-pause functionality
- Efficiency ratings and usage statistics

## Usage Examples

### Deploying a Program
```typescript
const program = await svmService.createProgram({
  name: 'Token Program',
  description: 'Custom SPL token implementation',
  programType: ProgramType.CUSTOM,
  bytecode: 'base64-encoded-bytecode',
  maxComputeUnits: 200000
});

const deployed = await svmService.deployProgram(program.id, {
  bytecode: 'base64-encoded-bytecode',
  maxComputeUnits: 500000
});
```

### Executing Programs in Parallel
```typescript
const executions = await svmService.executeParallel({
  executions: [
    {
      programId: 'program1',
      instructionData: 'base64-data',
      accounts: ['account1', 'account2'],
      maxComputeUnits: 100000
    },
    {
      programId: 'program2',
      instructionData: 'base64-data',
      accounts: ['account3', 'account4'],
      maxComputeUnits: 150000
    }
  ],
  maxTotalComputeUnits: 500000,
  continueOnFailure: true
});
```

### Gas Metering
```typescript
const meter = await svmService.createGasMeter({
  programId: 'program1',
  meterType: GasMeterType.PROGRAM,
  gasAllocated: 1000000,
  gasLimitPerOperation: 200000,
  alertThresholdPercent: 80,
  autoPauseOnThreshold: true
});

// Consume gas during execution
await svmService.consumeGas('program1', 50000, 'token-transfer');
```

## Architecture Benefits

1. **Parallel Processing**: Leverages Solana's Sealevel runtime for concurrent execution
2. **Resource Management**: In-depth gas metering prevents abuse and ensures fair resource allocation
3. **Monitoring & Analytics**: Detailed execution metrics and program statistics
4. **Scalability**: Efficient database design and query optimization
5. **Security**: Input validation, access control, and secure key management

## Testing

The module includes in-depth unit tests covering:
- Program lifecycle management
- Runtime execution scenarios
- Gas metering functionality
- Parallel execution coordination
- Error handling and edge cases

Run tests with:
```bash
npm test svm
```

## Integration with Existing Modules

The SVM module integrates with:
- **Transactions Module**: For transaction building and submission
- **Fee Module**: For fee calculation and prioritization
- **MPC Module**: For threshold signing in program execution
- **Accounts Module**: For account management and PDAs

This completes the SVM integration for the Solana study repository, providing a full-featured platform for learning and implementing Solana Virtual Machine concepts.