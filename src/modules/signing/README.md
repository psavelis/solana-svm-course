# Ed25519 Signing Service

This module provides cryptographic signing capabilities using the Ed25519 digital signature algorithm, which is the standard for Solana blockchain transactions.

## Features

- **Key Generation**: Generate new Ed25519 keypairs
- **Message Signing**: Sign arbitrary messages
- **Signature Verification**: Verify signatures against messages and public keys
- **Transaction Signing**: Create and sign Solana transfer transactions
- **Security**: Private keys are never exposed in responses

## API Endpoints

### Generate Keypair
```http
POST /signing/generate-keypair
```

**Response:**
```json
{
  "publicKey": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH"
}
```

### Sign Message
```http
POST /signing/sign-message
Content-Type: application/json

{
  "privateKey": "[1,2,3,...]", // JSON array of secret key bytes
  "message": "SGVsbG8gV29ybGQ=" // Base64 encoded message
}
```

**Response:**
```json
{
  "signature": "base64-encoded-signature",
  "publicKey": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH",
  "success": true
}
```

### Verify Signature
```http
POST /signing/verify-signature
Content-Type: application/json

{
  "signature": "base64-encoded-signature",
  "message": "SGVsbG8gV29ybGQ=",
  "publicKey": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH"
}
```

**Response:**
```json
{
  "isValid": true,
  "publicKey": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH",
  "message": "Signature is valid"
}
```

### Create Transfer Transaction
```http
POST /signing/create-transfer
Content-Type: application/json

{
  "privateKey": "[1,2,3,...]",
  "toAddress": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "amount": 1000000
}
```

**Response:**
```json
{
  "signature": "transaction-signature",
  "publicKey": "7xKXtg2CW99KHZhEN4fSnMZq8vd3fW3xvJxvBjGpKcH",
  "success": true
}
```

## Security Notes

- **Private Key Handling**: Private keys should never be stored in plain text. In production, use hardware security modules (HSM) or key management services.
- **Key Generation**: Generate keys client-side when possible to avoid server-side key exposure.
- **Network Security**: Ensure all API calls use HTTPS in production.
- **Rate Limiting**: Implement rate limiting to prevent abuse of signing endpoints.

## Testing

The service includes comprehensive unit tests covering:
- Keypair generation
- Message signing and verification
- Error handling for invalid inputs
- Transaction creation logic

Run tests with:
```bash
npm test -- --testPathPattern=signing.service.spec.ts
```

## Dependencies

- `@solana/web3.js`: Solana Web3 library
- `tweetnacl`: Ed25519 signing library
- `@nestjs/common`: NestJS framework
- `typeorm`: Database ORM

## Next Steps

Future enhancements may include:
- Hardware wallet integration
- Multi-signature support
- Threshold cryptography
- MPC (Multi-Party Computation) protocols