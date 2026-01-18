# Esports Module

Production-grade monetized competitive gaming infrastructure on Solana with MPC-secured wallets.

## Overview

This module implements a complete esports platform with:

- **Monetized Matchmaking**: Entry fee collection, escrow management, automated payouts
- **MPC Wallets**: 2-of-3 threshold signature wallets for secure player earnings
- **Prize Distribution**: Automatic prize calculation and multi-recipient transfers
- **Tournament Management**: Bracket generation, round advancement, final rankings

## Architecture

```
EsportsController
    ├── MatchmakingService
    │       ├── EscrowService
    │       ├── PlayerWalletService → MpcService
    │       └── PrizeDistributionService
    ├── TournamentService
    │       ├── MatchmakingService
    │       └── PrizeDistributionService
    └── PlayerWalletService
            └── MpcService (2-of-3 threshold signing)
```

## Entities

| Entity | Description |
|--------|-------------|
| `Match` | Competitive match with entry fee and prize pool |
| `MatchParticipant` | Player joined to a match |
| `Tournament` | Multi-round bracket tournament |
| `TournamentRegistration` | Player registered for tournament |
| `PlayerWallet` | MPC-secured wallet for player earnings |
| `WalletTransaction` | Deposit, withdrawal, prize transactions |
| `EscrowAccount` | Holds entry fees until match completion |
| `EscrowTransaction` | Deposit, release, refund operations |
| `PrizeDistribution` | Prize payout records |

## API Endpoints

### Matches

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/esports/matches` | Create monetized match |
| POST | `/esports/matches/:id/join` | Join with entry fee |
| POST | `/esports/matches/:id/start` | Start match, lock escrow |
| POST | `/esports/matches/:id/result` | Submit result, distribute prizes |
| DELETE | `/esports/matches/:id` | Cancel and refund |
| GET | `/esports/matches` | List matches |
| GET | `/esports/matches/:id` | Get match details |

### Player Wallets

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/esports/wallets` | Create MPC wallet |
| GET | `/esports/wallets/:playerId` | Get wallet |
| GET | `/esports/wallets/:playerId/balance` | Get balance |
| POST | `/esports/wallets/:playerId/deposit` | Record deposit |
| POST | `/esports/wallets/:playerId/withdraw` | MPC-signed withdrawal |
| GET | `/esports/wallets/:playerId/transactions` | Transaction history |

### Tournaments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/esports/tournaments` | Create tournament |
| POST | `/esports/tournaments/:id/register` | Register player |
| POST | `/esports/tournaments/:id/bracket` | Generate bracket |
| POST | `/esports/tournaments/:id/advance` | Advance round |
| DELETE | `/esports/tournaments/:id` | Cancel and refund |
| GET | `/esports/tournaments` | List tournaments |
| GET | `/esports/tournaments/:id` | Get tournament |

### Prizes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/esports/prizes/:sourceType/:sourceId` | Get prize info |
| GET | `/esports/prizes/:sourceType/:sourceId/distribution` | Get distribution |
| GET | `/esports/prizes/history` | Prize history |

## Security

### MPC Wallet Security

Player wallets use 2-of-3 threshold signature scheme:

1. **Player Share**: Held on player's device (mobile/hardware key)
2. **Platform Share**: Server-side automated signing
3. **Recovery Share**: Cold storage backup

Withdrawals require signatures from player + platform, ensuring:
- Platform cannot withdraw without player consent
- Player cannot bypass platform controls
- Recovery possible if player loses their share

### Escrow Protection

- Entry fees locked immediately upon joining
- Escrow locked when match starts (no withdrawals)
- Atomic prize distribution on completion
- Full refund on cancellation

### Rate Limiting

- Daily withdrawal limits (configurable)
- Cooldown period between withdrawals (5 minutes)
- Daily limit reset at midnight UTC

## Configuration

```env
# Esports Configuration
ESPORTS_PLATFORM_FEE_PERCENT=5
ESPORTS_MIN_ENTRY_FEE_LAMPORTS=1000000
ESPORTS_MAX_ENTRY_FEE_LAMPORTS=100000000000

# Withdrawal Limits
WITHDRAWAL_DAILY_LIMIT_LAMPORTS=10000000000
WITHDRAWAL_COOLDOWN_SECONDS=300
```

## Usage Example

### Create and Play a Match

```typescript
// 1. Create player wallets
const wallet1 = await POST('/esports/wallets', { playerId: 'player_1' });
const wallet2 = await POST('/esports/wallets', { playerId: 'player_2' });

// 2. Deposit funds
await POST('/esports/wallets/player_1/deposit', {
  amount: '5000000000', // 5 SOL
  signature: 'tx_signature_1'
});

await POST('/esports/wallets/player_2/deposit', {
  amount: '5000000000',
  signature: 'tx_signature_2'
});

// 3. Create match
const match = await POST('/esports/matches', {
  gameType: 'duel',
  entryFee: '1000000000', // 1 SOL
  minPlayers: 2,
  maxPlayers: 2,
  platformFeePercent: 5
});

// 4. Players join
await POST(`/esports/matches/${match.matchId}/join`, { playerId: 'player_1' });
await POST(`/esports/matches/${match.matchId}/join`, { playerId: 'player_2' });

// 5. Start match
await POST(`/esports/matches/${match.matchId}/start`);

// 6. Submit result
await POST(`/esports/matches/${match.matchId}/result`, {
  winnerIds: ['player_1'],
  scores: { player_1: 16, player_2: 12 },
  submittedBy: 'admin'
});

// Winner receives: 2 SOL - 5% fee = 1.9 SOL
```

## References

- [Architecture Diagram](../../../docs/diagrams/16-esports-matchmaking.md)
- [MPC Module](../mpc/README.md)
- [Transactions Module](../transactions/README.md)
