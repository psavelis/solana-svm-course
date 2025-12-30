# MPC (Multi-Party Computation) Module

This module implements Multi-Party Computation (MPC) for secure distributed signing of Solana transactions. It provides threshold cryptography capabilities where multiple participants must collaborate to sign transactions, enhancing security through key share distribution.

## Overview

The MPC module enables:
- **Distributed Key Generation**: Secure creation of key shares across multiple participants
- **Threshold Signing**: Transactions require a minimum number of participants to sign
- **Key Share Management**: Secure storage and management of cryptographic shares
- **Recovery Mechanisms**: Ability to revoke and recover lost key shares

## Supported Threshold Schemes

- **2-of-3**: 2 out of 3 participants required for signing
- **3-of-5**: 3 out of 5 participants required for signing
- **4-of-7**: 4 out of 7 participants required for signing

## Architecture

### Entities

- **MpcWallet**: Represents an MPC wallet with distributed key shares
- **KeyShare**: Individual cryptographic shares held by participants

### Services

- **MpcService**: Core business logic for MPC operations
- **MpcController**: REST API endpoints for MPC wallet management

## API Endpoints

### Create MPC Wallet
```http
POST /mpc/wallets
Content-Type: application/json

{
  "name": "Team Treasury Wallet",
  "thresholdScheme": "2-of-3",
  "participants": [
    {
      "participantId": "alice",
      "participantPublicKey": "alice-public-key"
    },
    {
      "participantId": "bob",
      "participantPublicKey": "bob-public-key"
    },
    {
      "participantId": "charlie",
      "participantPublicKey": "charlie-public-key"
    }
  ],
  "metadata": {
    "description": "Company treasury wallet",
    "tags": ["treasury", "company"]
  }
}
```

**Response:**
```json
{
  "id": "wallet-uuid",
  "walletId": "mpc_abc123",
  "name": "Team Treasury Wallet",
  "thresholdScheme": "2-of-3",
  "totalShares": 3,
  "threshold": 2,
  "publicKey": "combined-public-key",
  "status": "active",
  "activeShares": 3,
  "canSign": true,
  "createdAt": "2025-12-29T12:00:00Z"
}
```

### Get All MPC Wallets
```http
GET /mpc/wallets
```

### Get Specific Wallet
```http
GET /mpc/wallets/{walletId}
```

### Get Key Shares for Participant
```http
GET /mpc/wallets/{walletId}/shares?participantId=alice
```

**Response:**
```json
[
  {
    "id": "share-uuid",
    "participantId": "alice",
    "shareIndex": 0,
    "status": "active",
    "type": "original",
    "lastUsedAt": null,
    "createdAt": "2025-12-29T12:00:00Z"
  }
]
```

### Sign Transaction with MPC
```http
POST /mpc/sign
Content-Type: application/json

{
  "walletId": "mpc_abc123",
  "transactionData": "base64-encoded-transaction",
  "participantShares": [
    {
      "participantId": "alice",
      "signatureShare": "alice-partial-signature"
    },
    {
      "participantId": "bob",
      "signatureShare": "bob-partial-signature"
    }
  ]
}
```

**Response:**
```json
{
  "completeSignature": "reconstructed-full-signature",
  "publicKey": "wallet-public-key",
  "reconstructed": true,
  "participantsUsed": 2
}
```

### Revoke Key Share
```http
DELETE /mpc/wallets/{walletId}/shares/{participantId}/{shareIndex}
```

## Security Considerations

### Key Share Security
- Key shares are encrypted before storage
- Participants can only access their own shares
- Shares can be revoked for security incidents

### Threshold Security
- Minimum threshold prevents single points of failure
- Distributed trust across multiple participants
- Recovery mechanisms for lost shares

### Audit Trail
- All operations are logged
- Share usage is tracked
- Recovery attempts are recorded

## Usage Examples

### Creating an MPC Wallet
```typescript
import { MpcService } from './mpc/mpc.service';

const mpcService = new MpcService();

const wallet = await mpcService.createMpcWallet({
  name: 'Development Team Wallet',
  thresholdScheme: ThresholdScheme.TSS_2_3,
  participants: [
    { participantId: 'dev1', participantPublicKey: 'pubkey1' },
    { participantId: 'dev2', participantPublicKey: 'pubkey2' },
    { participantId: 'dev3', participantPublicKey: 'pubkey3' },
  ],
});

console.log(`Created MPC wallet: ${wallet.walletId}`);
```

### Signing a Transaction
```typescript
// Each participant generates their signature share
const signatureResult = await mpcService.signTransaction({
  walletId: wallet.walletId,
  transactionData: encodedTransaction,
  participantShares: [
    { participantId: 'dev1', signatureShare: 'share1' },
    { participantId: 'dev2', signatureShare: 'share2' },
  ],
});

console.log(`Transaction signed: ${signatureResult.completeSignature}`);
```

## Testing

Run the MPC module tests:
```bash
npm test -- --testPathPattern=mpc
```

## Database Migrations

The MPC module requires database migrations to create the necessary tables:

```bash
npm run migration:run
```

## Future Enhancements

- **Hardware Security Module (HSM) Integration**: Enhanced security for key shares
- **Advanced Threshold Schemes**: Support for more complex threshold configurations
- **Cross-Chain MPC**: Multi-chain transaction signing
- **MPC Recovery Protocols**: Advanced recovery mechanisms for lost shares

## Dependencies

- `@nestjs/common`: NestJS framework
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM
- `crypto`: Node.js cryptography module

## Course Example: Run 8 - Multi-Party Computation

This module serves as **Run 8** in the Solana SVM study course, demonstrating:

1. **Threshold Cryptography Concepts**: Understanding distributed trust
2. **MPC Protocol Implementation**: Real-world MPC wallet creation
3. **Security Best Practices**: Key share management and recovery
4. **API Design**: RESTful endpoints for MPC operations
5. **Database Design**: Entity relationships for distributed systems

The implementation provides a foundation for understanding advanced cryptographic protocols used in enterprise blockchain applications.