---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 8: Multi-Party Computation'
footer: 'Threshold Cryptography & Secure Signing'
---

# Module 8: Multi-Party Computation (MPC)

## Threshold Cryptography for Secure Signing

---

## What is MPC?

### Multi-Party Computation
- **Distributed Cryptography**: Multiple parties compute together without revealing secrets
- **Threshold Security**: t-of-n scheme (need t shares out of n total to sign)
- **Secure Signing**: Sign transactions without exposing private keys

### Use Cases
- **Multi-sig Wallets**: Distributed control over funds
- **Secure Custody**: Institutional-grade key management
- **Decentralized Signing**: No single point of failure

---

## Threshold Schemes

### Common Configurations
- **2-of-3**: 2 shares needed, 3 total shares
- **3-of-5**: 3 shares needed, 5 total shares
- **4-of-7**: 4 shares needed, 7 total shares

### Security Properties
- **t shares**: Minimum required for signing
- **n shares**: Total shares distributed
- **No single point**: No individual can sign alone
- **Flexible recovery**: Replace compromised shares

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             MpcController                            │   │
│  │  • POST /mpc/wallets → createMpcWallet()             │   │
│  │  • GET /mpc/wallets → getMpcWallets()                │   │
│  │  • GET /mpc/wallets/:walletId → getMpcWallet()       │   │
│  │  • GET /mpc/wallets/:walletId/shares → getShares()   │   │
│  │  • POST /mpc/sign → signTransaction()                │   │
│  │  • DELETE /mpc/wallets/... → revokeKeyShare()        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              MpcService                              │   │
│  │  • createMpcWallet() - Wallet creation               │   │
│  │  • getMpcWallets() - Wallet listing                  │   │
│  │  • getMpcWallet() - Wallet retrieval                 │   │
│  │  • getWalletKeyShares() - Share distribution         │   │
│  │  • signTransaction() - Threshold signing             │   │
│  │  • revokeKeyShare() - Share revocation               │   │
│  │  • generateDistributedKey() - DKG simulation         │   │
│  │  • reconstructSignature() - Signature reconstruction │   │
│  │  • validateParticipantShares() - Share validation    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Repository<MpcWallet>                              │   │
│  │  • Repository<KeyShare>                               │   │
│  │  • One-to-Many: Wallet → Shares                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Threshold Schemes                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Implemented Schemes                        │   │
│  │  • 2-of-3: 2 shares needed, 3 total                   │   │
│  │  • 3-of-5: 3 shares needed, 5 total                   │   │
│  │  • 4-of-7: 4 shares needed, 7 total                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```
```

---

## Database Schema

### MpcWallet Entity
- `id`: Primary key (UUID)
- `walletId`: Unique public identifier
- `name`: Human-readable wallet name
- `thresholdScheme`: TSS_2_3, TSS_3_5, TSS_4_7
- `totalShares`: Total number of shares
- `threshold`: Minimum shares for signing
- `publicKey`: Combined public key
- `status`: CREATING, ACTIVE, RECOVERING, DISABLED

### KeyShare Entity
- `id`: Primary key (UUID)
- `walletId`: Foreign key to wallet
- `participantId`: Participant identifier
- `shareIndex`: Share position (0, 1, 2, etc.)
- `encryptedShare`: AES-256 encrypted share
- `participantPublicKey`: Participant verification key
- `status`: ACTIVE, REVOKED, RECOVERING
- `type`: ORIGINAL, RECOVERY

---

## API Endpoints

### Wallet Management
- `POST /mpc/wallets` - Create new MPC wallet
- `GET /mpc/wallets` - List all MPC wallets
- `GET /mpc/wallets/:walletId` - Get wallet details
- `GET /mpc/wallets/:walletId/shares` - Get wallet shares (metadata only)

### Signing Operations
- `POST /mpc/sign` - Sign transaction with threshold shares
- `DELETE /mpc/wallets/:walletId/shares/:participantId/:shareIndex` - Revoke key share

---

## Wallet Creation Flow

### Step-by-Step Process
1. **Validate Participants**: Minimum 2 participants required
2. **Determine Threshold**: Based on selected scheme (2-of-3, 3-of-5, etc.)
3. **Generate Distributed Key**: DKG (Distributed Key Generation) simulation
4. **Create Wallet Entity**: Persist wallet metadata to database
5. **Create Key Shares**: Generate and encrypt individual shares
6. **Return Response**: Public wallet data (no sensitive information)

---

## Threshold Signing Flow

### Signing Process
1. **Load Wallet**: Verify wallet is active and valid
2. **Validate Share Count**: Ensure threshold number of shares provided
3. **Validate Shares**: Authenticate each participant's shares
4. **Reconstruct Signature**: Combine partial signatures into complete signature
5. **Update Usage**: Track share usage for audit purposes
6. **Return Result**: Complete signature for transaction

---

## Key Share Management

### Share Operations
- **Distribution**: Secure delivery to authorized participants
- **Revocation**: Immediate response to security compromise
- **Recovery**: Generate backup shares for lost access
- **Encryption**: AES-256 encryption for all shares at rest
- **Validation**: Participant public key authentication

---

## Security Features

### Cryptographic Security
- **Encrypted Shares**: AES-256 encryption at rest
- **Participant Authentication**: Public key verification
- **Threshold Security**: t-of-n signing requirements
- **Share Revocation**: Immediate compromise response
- **Audit Trail**: Complete usage tracking
- **Status Management**: Active/Disabled wallet states

---

## Implementation Example

### Creating an MPC Wallet
```typescript
// Create 2-of-3 MPC wallet
const wallet = await mpcService.createMpcWallet({
  name: "Company Treasury",
  thresholdScheme: ThresholdScheme.TSS_2_3,
  participants: [
    { id: "alice", publicKey: alicePubKey },
    { id: "bob", publicKey: bobPubKey },
    { id: "charlie", publicKey: charliePubKey }
  ]
});

// Returns wallet with public key and share count
console.log(wallet.publicKey); // Combined public key
console.log(wallet.totalShares); // 3
console.log(wallet.threshold); // 2
```

---

### Threshold Signing
```typescript
// Sign transaction with 2 shares (for 2-of-3 wallet)
const signature = await mpcService.signTransaction({
  walletId: wallet.id,
  transaction: serializedTransaction,
  shares: [
    { participantId: "alice", shareIndex: 0, encryptedShare: aliceShare },
    { participantId: "bob", shareIndex: 1, encryptedShare: bobShare }
  ]
});

// Use signature in Solana transaction
const tx = Transaction.from(Buffer.from(serializedTransaction));
tx.addSignature(wallet.publicKey, signature);
```

---

## Error Handling

### Common Errors
- **BadRequestException**: Invalid parameters or insufficient shares
- **NotFoundException**: Wallet or share not found
- **UnauthorizedException**: Invalid participant authentication
- **ForbiddenException**: Threshold not met for signing

### Validation Checks
- Participant public key verification
- Share encryption validation
- Threshold requirement enforcement
- Wallet status verification

---

## Use Cases & Benefits

### Institutional Custody
- **Secure Key Management**: No single employee can access funds
- **Regulatory Compliance**: Audit trails and access controls
- **Business Continuity**: Share recovery for lost access

### Decentralized Applications
- **DAO Treasury**: Multi-sig control for community funds
- **DeFi Protocols**: Secure oracle or bridge operations
- **NFT Marketplaces**: Escrow and royalty management

---

## Performance Considerations

### Optimization Strategies
- **Share Caching**: Cache decrypted shares for session
- **Batch Signing**: Process multiple transactions together
- **Connection Pooling**: Efficient database connections
- **Async Processing**: Non-blocking cryptographic operations

### Scalability
- **Horizontal Scaling**: Multiple MPC service instances
- **Load Balancing**: Distribute signing requests
- **Rate Limiting**: Prevent abuse and DoS attacks

---

## Security Best Practices

### Operational Security
- **Secure Share Storage**: Encrypted cold storage for shares
- **Access Logging**: Complete audit trail of all operations
- **Regular Rotation**: Periodic key share rotation
- **Backup Procedures**: Secure backup and recovery processes

### Cryptographic Security
- **Key Share Encryption**: Strong encryption for stored shares
- **Secure Communication**: TLS for all API communications
- **Participant Verification**: Multi-factor authentication
- **Compromise Response**: Immediate share revocation procedures

---

## Integration with Solana

### Transaction Signing
- **Ed25519 Compatibility**: Works with Solana's signature scheme
- **Transaction Serialization**: Standard Solana transaction format
- **Fee Management**: Integrated with fee estimation services

### Wallet Abstraction
- **Unified Interface**: Same API as regular wallets
- **Transparent Operation**: Applications don't need MPC awareness
- **Fallback Support**: Regular keypair signing as backup

---

## Next Steps

### Module 8 Implementation Tasks
- ✅ Threshold signature generation
- ✅ Distributed key generation
- ✅ Key share management
- ✅ Signature reconstruction
- ✅ MPC wallet creation
- ✅ Secure key distribution
- ✅ MPC transaction signing
- ✅ Recovery mechanisms

### Related Modules
- **Module 7**: Signing & Cryptography
- **Module 12**: Security Practices
- **Module 4**: Account Abstraction

---

# Thank You!

## Questions?

**MPC enables secure, distributed control over blockchain assets!**

[Back to Study Topics](../study-topics.md) ⬅️