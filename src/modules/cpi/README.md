# CPI (Cross-Program Invocations) Module

This module implements Cross-Program Invocations (CPI) for the Solana SVM study repository. CPI allows programs to call other programs on the Solana blockchain, enabling program composition and complex DeFi protocols.

## Features

- **CPI Instruction Builder**: Create and manage CPI instruction templates
- **Permission Management**: Control which programs can invoke others
- **Invocation Tracking**: Log and monitor all CPI calls
- **Security Validation**: Ensure proper permissions and data validation
- **SVM Integration**: Execute CPIs through the SVM runtime

## Entities

### CpiInstruction
Represents a template for CPI calls between programs.

### CpiPermission
Manages permissions for programs to invoke other programs.

### CpiInvocation
Tracks actual CPI call executions and their results.

## API Endpoints

### Instructions
- `POST /cpi/instructions` - Create CPI instruction template
- `GET /cpi/instructions/:programId` - Get instructions for a program

### Permissions
- `POST /cpi/permissions` - Create CPI permission
- `PUT /cpi/permissions/:id` - Update CPI permission
- `POST /cpi/check-permission` - Check if permission exists

### Execution
- `POST /cpi/execute` - Execute a CPI call
- `GET /cpi/history` - Get CPI invocation history

### DEX Integration
- `POST /cpi/dex/swap` - Perform a DEX swap using CPI
- `GET /cpi/dex/history` - Get DEX swap history

## Usage Examples

### Creating a CPI Instruction
```typescript
const instruction = await cpiService.createInstruction({
  programId: 'target-program-id',
  callerProgramId: 'caller-program-id',
  instructionData: { method: 'transfer', amount: 1000 },
  accounts: [
    { pubkey: 'account1', isSigner: true, isWritable: true },
    { pubkey: 'account2', isSigner: false, isWritable: true },
  ],
  requiresPermission: true,
  permissionLevel: 'write',
});
```

### Executing a CPI Call
```typescript
const result = await cpiService.executeCpi({
  transactionId: 'tx-123',
  callerProgramId: 'caller-program-id',
  targetProgramId: 'target-program-id',
  instructionName: 'transfer',
  instructionData: { amount: 1000 },
  accounts: [...],
});
```

### Checking Permissions
```typescript
const hasPermission = await cpiService.checkPermission(
  'caller-program-id',
  'target-program-id',
  'write',
);
```

### DEX Swap Example
```typescript
const swapResult = await dexService.performSwap(
  'user-123',
  'So11111111111111111111111111111111111111112', // SOL mint
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  1000000, // 1 SOL in lamports
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // DEX program ID
);
```

## Security Considerations

- All CPI calls validate permissions when required
- Program IDs are validated as valid Solana public keys
- Instruction data is validated before execution
- Failed CPI calls are logged with error details
- Permission expiration is enforced

## Integration with SVM

The CPI module integrates with the SVM service to execute program calls. When a CPI is executed:

1. Permission validation (if required)
2. Instruction creation and validation
3. SVM execution with gas metering
4. Result logging and tracking

This enables complex program compositions while maintaining security and auditability.