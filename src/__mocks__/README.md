# Mock Services for Blockchain Interactions

This directory contains comprehensive mock implementations for testing blockchain interactions without requiring actual Solana network connections.

## Overview

The mock services provide deterministic, fast, and reliable testing of blockchain-dependent code by simulating:

- Solana RPC connections and responses
- SPL token operations
- Web3.js transaction handling
- Account information and balances

## Components

### Solana Connection Mock (`solana-connection.mock.ts`)
Mock implementation of `@solana/web3.js` Connection class with:
- `getAccountInfo()` - Returns mock account data
- `getBalance()` - Returns mock SOL balance
- `getSlot()` - Returns mock slot number
- `getVersion()` - Returns mock version info
- `sendAndConfirmTransaction()` - Returns mock transaction signature

### SPL Token Mock (`spl-token.mock.ts`)
Mock implementations for `@solana/spl-token` functions:
- Token account operations (create, mint, burn, transfer)
- Associated token account management
- Token approval and delegation
- Account freezing/thawing

### Web3.js Mock (`web3.mock.ts`)
Mock implementations for `@solana/web3.js` utilities:
- PublicKey and Keypair generation
- System program instructions
- Transaction construction
- Compute budget management

### Test Utilities (`test-utils.ts`)
Comprehensive testing utilities including:
- Test module builders
- Repository helpers
- Blockchain interaction helpers
- Test data factories

## Usage

### Basic Setup

```typescript
import { TestModuleBuilder, MockServices } from '../__mocks__/test-utils';

describe('MyService', () => {
  let service: MyService;

  beforeEach(async () => {
    const module = await new TestModuleBuilder()
      .withEntities(MyEntity)
      .withProviders(MyService)
      .build();

    service = module.get<MyService>(MyService);
  });

  afterEach(() => {
    MockServices.resetAllMocks();
  });
});
```

### Mocking Blockchain Responses

```typescript
import { BlockchainHelpers } from '../__mocks__/test-utils';

it('should get account balance', async () => {
  // Mock a specific account balance
  BlockchainHelpers.mockBalance('11111111111111111111111111111112', 5000000);

  const balance = await service.getBalance('11111111111111111111111111111112');
  expect(balance).toBe(5000000);
});
```

### Mocking Token Operations

```typescript
import { MockServices } from '../__mocks__/test-utils';

it('should create token account', async () => {
  // Mock associated token address
  MockServices.splToken.getAssociatedTokenAddress
    .mockResolvedValueOnce(new PublicKey('ATA111...'));

  const ata = await service.createAssociatedTokenAccount(mint, owner);
  expect(ata.toString()).toBe('ATA111...');
});
```

### Mocking Transactions

```typescript
import { BlockchainHelpers } from '../__mocks__/test-utils';

it('should send transaction', async () => {
  // Mock transaction confirmation
  BlockchainHelpers.mockTransactionSignature('tx_abc123');

  const signature = await service.sendTransaction(transaction);
  expect(signature).toBe('tx_abc123');
});
```

## Test Data Factories

Use factories to generate consistent test data:

```typescript
import { TestDataFactory } from '../__mocks__/test-utils';

const address = TestDataFactory.solanaAddress(); // Valid Solana address
const mint = TestDataFactory.tokenMint(); // Wrapped SOL mint
const wallet = TestDataFactory.userWallet(); // Random user wallet
const signature = TestDataFactory.transactionSignature(); // Mock signature
```

## Global Setup

The `test-setup.ts` file automatically:
- Sets up all mocks before each test
- Configures test environment variables
- Mocks console methods to reduce noise
- Sets appropriate test timeouts

## Best Practices

### 1. Reset Mocks Between Tests
```typescript
afterEach(() => {
  MockServices.resetAllMocks();
});
```

### 2. Use Specific Mock Values
```typescript
// Good: Specific mock for test case
BlockchainHelpers.mockBalance(address, 1000000);

// Avoid: Generic mocks that affect other tests
```

### 3. Test Error Scenarios
```typescript
it('should handle connection errors', async () => {
  MockServices.connection.getBalance.mockRejectedValueOnce(
    new Error('Connection failed')
  );

  await expect(service.getBalance(address)).rejects.toThrow('Connection failed');
});
```

### 4. Verify Mock Interactions
```typescript
it('should call blockchain method', async () => {
  await service.getBalance(address);

  expect(MockServices.connection.getBalance).toHaveBeenCalledWith(
    expect.any(PublicKey)
  );
});
```

## Integration with Existing Tests

To integrate mocks with existing service tests:

1. Update imports to use mock connection
2. Replace direct Connection instantiation with injected mock
3. Use BlockchainHelpers for response mocking
4. Verify mock method calls

## Coverage

These mocks enable testing of:
- ✅ Account information retrieval
- ✅ Balance queries
- ✅ Token operations (mint, burn, transfer)
- ✅ Transaction sending and confirmation
- ✅ Associated token account management
- ✅ Error handling and edge cases
- ✅ Network switching and failover

## Maintenance

When updating blockchain integration code:
1. Update corresponding mocks
2. Add new mock methods as needed
3. Update test utilities
4. Ensure backward compatibility