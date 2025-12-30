---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 3: Token Standards'
footer: 'SPL Token Implementation'
---

# Module 3: Token Standards (SPL Tokens)

## Solana Program Library Tokens

---

## SPL vs ERC Standards

### Solana Token Standards
- **SPL (Solana Program Library)**: Native token standard
- **SPL-Token**: Fungible tokens (like ERC-20)
- **SPL-Token-2022**: Enhanced token standard with extensions

### EVM Comparison
- **ERC-20**: Basic fungible tokens
- **ERC-721**: Non-fungible tokens
- **ERC-1155**: Multi-token standard

---

## Token Account Model

### Three Account Types
1. **Mint Account**: Token definition (supply, decimals, authorities)
2. **Token Account**: User's token balance
3. **Associated Token Account (ATA)**: Deterministic token account address

### Key Differences from EVM
- **Separate Accounts**: Each token holding requires a token account
- **ATAs**: Automatic account derivation per wallet-token pair
- **No Direct Balance**: Balance stored in separate token accounts

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            TokensController                          │   │
│  │  • POST /tokens → create()                          │   │
│  │  • GET /tokens → findAll()                          │   │
│  │  • GET /tokens/:id → findOne()                      │   │
│  │  • GET /tokens/mint/:address → findByMint()         │   │
│  │  • PUT /tokens/:id → update()                       │   │
│  │  • DELETE /tokens/:id → remove()                    │   │
│  │  • GET /tokens/info/:address → getTokenInfo()       │   │
│  │  • GET /tokens/balance/:owner/:mint → getBalance()  │   │
│  │  • GET /tokens/accounts/:owner → getTokenAccounts() │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             TokensService                            │   │
│  │  • create() ← API calls                             │   │
│  │  • findAll() ← API calls                            │   │
│  │  • findOne() ← API calls                            │   │
│  │  • findByMint() ← API calls                        │   │
│  │  • update() ← API calls                             │   │
│  │  • remove() ← API calls                             │   │
│  │  • getTokenInfo() ← API calls                       │   │
│  │  │  - Queries Solana for mint data                  │   │
│  │  • getTokenBalance() ← API calls                    │   │
│  │  │  - Gets ATA balance                              │   │
│  │  • getTokenAccounts() ← API calls                   │   │
│  │  │  - Lists all token accounts for owner            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Repository<Token> ← Service Layer                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             SPL Token Integration                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            @solana/spl-token                          │   │
│  │  • TOKEN_PROGRAM_ID - Program constants              │   │
│  │  • getAssociatedTokenAddress() - ATA derivation      │   │
│  │  • getAccount() - Token account info                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│             Solana Web3.js Integration                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Connection                              │   │
│  │  • getAccountInfo() - Mint data parsing              │   │
│  │  • getTokenAccountsByOwner() - Owner token accounts  │   │
│  │  • PublicKey - Address handling                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
```

---

## Database Schema

### Token Entity Fields
- `id`: Primary key (UUID)
- `mintAddress`: Token mint address (unique)
- `name`: Token name
- `symbol`: Token symbol
- `decimals`: Decimal places
- `supply`: Total supply
- `owner`: Mint authority
- `isNft`: NFT flag
- `metadata`: Additional token data

---

## API Endpoints

### Token Management
- `POST /tokens` - Create token record
- `GET /tokens` - List all tokens
- `GET /tokens/:id` - Get token by ID
- `GET /tokens/mint/:address` - Get token by mint address
- `PUT /tokens/:id` - Update token metadata
- `DELETE /tokens/:id` - Remove token record

### Blockchain Queries
- `GET /tokens/info/:address` - Get mint account info
- `GET /tokens/balance/:owner/:mint` - Get token balance
- `GET /tokens/accounts/:owner` - Get all token accounts for owner

---

## Token Account Structures

### Mint Account (32 bytes)
- `mintAuthority`: Address that can mint new tokens
- `supply`: Total tokens in circulation
- `decimals`: Decimal places for display
- `isInitialized`: Whether mint is active
- `freezeAuthority`: Address that can freeze token accounts

### Token Account (165 bytes)
- `mint`: Which token this account holds
- `owner`: Who owns this token account
- `amount`: Token balance
- `delegate`: Address allowed to transfer tokens
- `state`: Account state (initialized/frozen)
- `delegatedAmount`: Amount delegate can transfer

---

## Associated Token Accounts (ATAs)

### Automatic Account Creation
- **Deterministic**: Same address for same wallet + token
- **No Private Key**: Controlled by wallet owner
- **Automatic Discovery**: No need to manually create

### ATA Derivation
```typescript
// Derive ATA address
const ataAddress = await getAssociatedTokenAddress(
  mintPublicKey,    // Token mint
  ownerPublicKey,   // Wallet address
  // TOKEN_PROGRAM_ID is implied
);
```

---

## Token Operations

### Creating a Token
```typescript
// Create mint account
const mint = await createMint(
  connection,
  payer,
  mintAuthority,
  freezeAuthority,
  decimals
);

// Create token account
const tokenAccount = await getOrCreateAssociatedTokenAccount(
  connection,
  payer,
  mint,
  owner
);
```

---

### Token Transfer
```typescript
// Transfer tokens between accounts
await transfer(
  connection,
  payer,
  sourceTokenAccount,
  destinationTokenAccount,
  owner,
  amount
);
```

---

### Minting Tokens
```typescript
// Mint new tokens to account
await mintTo(
  connection,
  payer,
  mint,
  destinationTokenAccount,
  mintAuthority,
  amount
);
```

---

## SPL Token Extensions

### Token-2022 Features
- **Transfer Fees**: Charge fees on transfers
- **Confidential Transfers**: Private token amounts
- **Non-transferable Tokens**: Soul-bound tokens
- **Interest-bearing Tokens**: Automatic yield
- **Permanent Delegate**: Always-authorized delegate

### Metadata Extension
- **Token Metadata**: Name, symbol, description, image
- **Creator Verification**: Verify content creators
- **Royalties**: Automatic royalty payments

---

## NFT Implementation

### SPL Token NFTs
- **Supply = 1**: Single token per mint
- **Decimals = 0**: No fractional NFTs
- **Unique Metadata**: Each NFT has unique attributes

### Metaplex Standard
- **Metadata Account**: Stores NFT metadata
- **Master Edition**: Controls supply and royalties
- **Creator Verification**: Verify NFT creators

---

## Common Patterns

### Token Balance Checking
```typescript
// Get token balance
const tokenAccounts = await getTokenAccountsByOwner(
  connection,
  ownerPublicKey,
  { mint: mintPublicKey }
);

const balance = tokenAccounts.value[0]?.account.data.parsed.info.tokenAmount.uiAmount;
```

---

### Batch Token Operations
```typescript
// Create multiple token transfers
const instructions = [];
for (const transfer of transfers) {
  const ix = createTransferInstruction(
    transfer.source,
    transfer.destination,
    transfer.owner,
    transfer.amount
  );
  instructions.push(ix);
}

// Execute all in one transaction
const transaction = new Transaction().add(...instructions);
```

---

## Performance Considerations

### Optimization Strategies
- **ATA Caching**: Cache associated token addresses
- **Batch Operations**: Combine multiple transfers
- **Lazy Loading**: Load token data on demand
- **Index Optimization**: Efficient database queries

### Scalability
- **Parallel Processing**: Handle multiple token operations
- **Connection Pooling**: Efficient RPC connections
- **Rate Limiting**: Prevent API abuse

---

## Security Best Practices

### Token Security
- **Authority Validation**: Verify mint/freeze authorities
- **Amount Validation**: Prevent overflow/underflow
- **Account Ownership**: Verify token account ownership
- **Freeze Protection**: Handle frozen accounts

### Smart Contract Risks
- **Reentrancy**: Prevent reentrant calls
- **Access Control**: Proper permission checks
- **Input Validation**: Sanitize all inputs
- **Audit Requirements**: Security audits for custom tokens

---

## Next Steps

### Module 3 Implementation Tasks
- ✅ Basic token CRUD operations
- ✅ Token balance queries
- ⏳ Token creation/minting
- ⏳ Token transfer operations
- ⏳ NFT support
- ⏳ Token metadata management

### Related Modules
- **Module 2**: Transactions & Instructions
- **Module 4**: Account Abstraction
- **Module 10**: CPIs (Cross-Program Invocations)

---

# Thank You!

## Questions?

**Ready to explore Account Abstraction?**

[Next: Module 4 - Account Abstraction](../04-account-abstraction.md) ➡️