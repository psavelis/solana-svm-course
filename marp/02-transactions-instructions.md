---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 2: Transactions & Instructions'
footer: 'Solana Transaction Architecture'
---

# Module 2: Transactions and Instructions

## Building and Submitting Transactions

---

## Transactions vs Instructions

### Solana Transaction Model
- **Transaction**: Container for multiple operations
- **Instructions**: Individual operations within a transaction
- **Key Difference**: One transaction can execute multiple instructions atomically

### EVM Comparison
- **EVM**: Each transaction calls one contract function
- **SVM**: Transactions can batch multiple operations

---

## Transaction Structure

### Core Components
- **Signatures**: Array of signer public keys
- **Message**: Contains all transaction data
  - Recent blockhash
  - Account addresses
  - Instructions array

### Instruction Format
- **Program ID**: Which program to execute
- **Accounts**: Which accounts the instruction uses
- **Data**: Instruction-specific parameters

---

## Transaction Lifecycle

### Status Flow
1. **PENDING**: Transaction created, not yet submitted
2. **CONFIRMED**: Successfully executed on-chain
3. **FAILED**: Execution failed with error

### Key Events
- Transaction created
- Status updates
- Confirmation notifications
- Failure alerts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          TransactionsController                      │   │
│  │  • POST /transactions → create()                    │   │
│  │  • GET /transactions → findAll()                    │   │
│  │  • GET /transactions/:id → findOne()                │   │
│  │  • GET /transactions/signature/:sig → findBySig()   │   │
│  │  • PUT /transactions/:id → update()                 │   │
│  │  • DELETE /transactions/:id → remove()              │   │
│  │  • GET /transactions/details/:sig → getTransaction()│   │
│  │  • POST /transactions/transfer → sendTransfer()     │   │
│  │  • GET /transactions/recent/list → getRecent()      │   │
│  │  • GET /transactions/fee/estimate → getFeeEstimate()│   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           TransactionsService                        │   │
│  │  • create() ← API calls                             │   │
│  │  • findAll() ← API calls                            │   │
│  │  • findOne() ← API calls                            │   │
│  │  • findBySignature() ← API calls                    │   │
│  │  • update() ← API calls                             │   │
│  │  • remove() ← API calls                             │   │
│  │  • getTransaction() ← API calls                     │   │
│  │  │  - Queries Solana RPC                            │   │
│  │  • sendTransfer() ← API calls                       │   │
│  │  │  - Builds and submits SOL transfers              │   │
│  │  • getRecentTransactions() ← API calls              │   │
│  │  • getFeeEstimate() ← API calls                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Event Publishing                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │        MessagePublisherService                       │   │
│  │  • publishTransactionCreated()                       │   │
│  │  │  → transaction.created event                      │   │
│  │  • publishTransactionStatusUpdated()                 │   │
│  │  │  → transaction.status_updated event               │   │
│  │  • publishTransactionConfirmed()                     │   │
│  │  │  → transaction.confirmed event                    │   │
│  │  • publishTransactionFailed()                        │   │
│  │  │  → transaction.failed event                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Repository<Transaction> ← Service Layer           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             Message Queue (Kafka)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            transaction-events topic                  │   │
│  │  • Event streaming for real-time updates             │   │
│  │  • Asynchronous processing                           │   │
│  │  • Reliable message delivery                         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
```

---

## Database Schema

### Transaction Entity Fields
- `id`: Primary key (UUID)
- `signature`: Solana transaction signature (unique)
- `type`: TRANSFER, TOKEN_TRANSFER, etc.
- `status`: PENDING, CONFIRMED, FAILED
- `fromAddress/toAddress`: Transfer addresses
- `amount`: Transaction amount
- `fee`: Transaction fee
- `slot`: Block slot number
- `blockTime`: Confirmation timestamp
- `instructions`: JSON array of instructions
- `metadata`: Additional transaction data

---

## API Endpoints

### Transaction Management
- `POST /transactions` - Create transaction record
- `GET /transactions` - List transactions
- `GET /transactions/:id` - Get by database ID
- `GET /transactions/signature/:sig` - Get by Solana signature
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Remove transaction

### Blockchain Operations
- `GET /transactions/details/:sig` - Get on-chain transaction
- `POST /transactions/transfer` - Send SOL transfer
- `GET /transactions/recent/list` - Get recent transactions
- `GET /transactions/fee/estimate` - Estimate transaction fees

---

## Event-Driven Architecture

### Message Publishing
- **transaction.created**: New transaction recorded
- **transaction.status_updated**: Status change occurred
- **transaction.confirmed**: Successfully confirmed on-chain
- **transaction.failed**: Transaction execution failed

### Kafka Integration
- Asynchronous event processing
- Reliable message delivery
- Scalable event streaming
- Dead letter queue for failures

---

## Transaction Types

### 1. SOL Transfers
- Simple value transfers
- System Program instructions
- Single instruction transactions

### 2. Token Transfers
- SPL Token Program instructions
- Associated Token Account handling
- Multi-instruction transactions

### 3. Program Interactions
- Custom program invocations
- Cross-Program Invocations (CPIs)
- Complex instruction sequences

---

## Fee Management

### Fee Components
- **Base Fee**: Fixed cost per signature
- **Priority Fee**: Optional tip for faster processing
- **Compute Units**: Gas-like metering for program execution

### Fee Estimation
- Query recent blockhash
- Calculate based on transaction size
- Account for network congestion
- Dynamic fee adjustment

---

## Implementation Examples

### Basic SOL Transfer
```typescript
// Create transfer instruction
const transferIx = SystemProgram.transfer({
  fromPubkey: senderPublicKey,
  toPubkey: receiverPublicKey,
  lamports: amount,
});

// Create and send transaction
const transaction = new Transaction().add(transferIx);
const signature = await sendAndConfirmTransaction(connection, transaction, [senderKeypair]);
```

---

### Transaction with Multiple Instructions
```typescript
// Create multiple instructions
const instructions = [
  SystemProgram.transfer({...}),
  TokenProgram.transfer({...}),
  // ... more instructions
];

// Add to transaction
const transaction = new Transaction();
transaction.add(...instructions);

// Send transaction
const signature = await sendAndConfirmTransaction(connection, transaction, signers);
```

---

## Error Handling

### Common Transaction Errors
- **Insufficient Funds**: Not enough SOL for transfer + fees
- **Invalid Account**: Account doesn't exist or wrong owner
- **Program Error**: Instruction execution failed
- **Timeout**: Transaction not confirmed in time

### Retry Mechanisms
- Exponential backoff
- Fee adjustment
- Alternative RPC endpoints
- Dead letter queue for persistent failures

---

## Performance Considerations

### Optimization Strategies
- Batch multiple operations in single transaction
- Use efficient instruction ordering
- Implement proper fee management
- Cache frequently used data

### Monitoring
- Transaction success rates
- Confirmation times
- Fee efficiency
- Error patterns

---

## Security Best Practices

### Transaction Security
- Validate all input parameters
- Verify account ownership
- Implement proper authorization
- Use secure key management

### Replay Protection
- Recent blockhash prevents replay
- Unique transaction signatures
- Proper nonce handling

---

## Next Steps

### Module 2 Implementation Tasks
- ✅ Basic transaction CRUD
- ✅ SOL transfer functionality
- ⏳ Multi-instruction transactions
- ⏳ Advanced fee management
- ⏳ Token transfer transactions

### Related Modules
- **Module 1**: Accounts & Programs
- **Module 3**: Token Standards
- **Module 5**: Fee Mechanism

---

# Thank You!

## Questions?

**Ready to explore Token Standards?**

[Next: Module 3 - Token Standards](../03-token-standards.md) ➡️