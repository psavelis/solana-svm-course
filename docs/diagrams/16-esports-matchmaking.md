# Esports Matchmaking & Prize Distribution

## Overview

Production-grade implementation of monetized competitive gaming infrastructure on Solana, featuring MPC-secured wallets, escrow-based match entry fees, and automated prize distribution.

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENT LAYER                                          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                                │
│  │ Game Client │     │ Web Client  │     │Mobile Client│                                │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘                                │
└─────────┼───────────────────┼───────────────────┼───────────────────────────────────────┘
          │                   │                   │
          └───────────────────┼───────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    API GATEWAY                                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                                │
│  │ Esports API │────▶│  WebSocket  │────▶│Authentication│                               │
│  └──────┬──────┘     └─────────────┘     └─────────────┘                                │
└─────────┼───────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CORE SERVICES                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                       │
│  │MatchmakingService│  │ TournamentService│  │PlayerWalletService│                      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘                       │
│           │                     │                     │                                  │
│  ┌────────┴─────────┐  ┌────────┴─────────┐          │                                  │
│  │PrizeDistribution │  │  EscrowService   │◀─────────┘                                  │
│  │     Service      │  │                  │                                              │
│  └────────┬─────────┘  └────────┬─────────┘                                             │
└───────────┼─────────────────────┼───────────────────────────────────────────────────────┘
            │                     │
            └──────────┬──────────┘
                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 MPC INFRASTRUCTURE                                       │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐                       │
│  │  MpcService │────▶│ Key Management  │────▶│Threshold Signing │                       │
│  └──────┬──────┘     └─────────────────┘     └────────┬─────────┘                       │
└─────────┼────────────────────────────────────────────┼──────────────────────────────────┘
          │                                            │
          └────────────────────┬───────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SOLANA BLOCKCHAIN                                        │
│  ┌───────────────┐     ┌─────────────────┐     ┌───────────────┐                        │
│  │Escrow Program │     │SPL Token Program│     │ System Program│                        │
│  └───────────────┘     └─────────────────┘     └───────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA LAYER                                            │
│  ┌───────────────┐     ┌───────────────┐     ┌───────────────┐                          │
│  │  PostgreSQL   │     │  Redis Cache  │     │ Kafka Events  │                          │
│  └───────────────┘     └───────────────┘     └───────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Architecture

### API Layer

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               ESPORTS CONTROLLER                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  POST   /esports/matches              → createMatch()                                   │
│  POST   /esports/matches/:id/join     → joinMatch()                                     │
│  POST   /esports/matches/:id/start    → startMatch()                                    │
│  POST   /esports/matches/:id/result   → submitResult()                                  │
│  GET    /esports/matches              → getMatches()                                    │
│  GET    /esports/matches/:id          → getMatch()                                      │
│  DELETE /esports/matches/:id          → cancelMatch()                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              TOURNAMENT CONTROLLER                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  POST   /esports/tournaments               → createTournament()                         │
│  POST   /esports/tournaments/:id/register  → registerPlayer()                           │
│  POST   /esports/tournaments/:id/bracket   → generateBracket()                          │
│  POST   /esports/tournaments/:id/advance   → advanceRound()                             │
│  GET    /esports/tournaments               → getTournaments()                           │
│  GET    /esports/tournaments/:id           → getTournament()                            │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PLAYER WALLET CONTROLLER                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  POST   /esports/wallets                         → createPlayerWallet()                 │
│  GET    /esports/wallets/:playerId               → getPlayerWallet()                    │
│  POST   /esports/wallets/:playerId/deposit       → deposit()                            │
│  POST   /esports/wallets/:playerId/withdraw      → withdraw()                           │
│  GET    /esports/wallets/:playerId/balance       → getBalance()                         │
│  GET    /esports/wallets/:playerId/transactions  → getTransactions()                    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                PRIZE CONTROLLER                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  POST   /esports/prizes/distribute   → distributePrizes()                               │
│  GET    /esports/prizes/:matchId     → getPrizeInfo()                                   │
│  GET    /esports/prizes/history      → getPrizeHistory()                                │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Service Layer

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              MATCHMAKING SERVICE                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  createMatch()        → Match Creation                                                 │
│  joinMatch()          → Player Join + Entry Fee                                        │
│  startMatch()         → Lock Escrow                                                    │
│  submitResult()       → Validate & Finalize                                            │
│  cancelMatch()        → Refund Processing                                              │
│  findMatch()          → Skill-Based Matching                                           │
│  validateEntryFee()   → Balance Verification                                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                ESCROW SERVICE                                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  createEscrow()       → Initialize Escrow Account                                      │
│  depositToEscrow()    → Transfer Entry Fees                                            │
│  releaseEscrow()      → Winner Payout                                                  │
│  refundEscrow()       → Cancel/Dispute Refund                                          │
│  getEscrowBalance()   → Balance Query                                                  │
│  lockEscrow()         → Prevent Withdrawals                                            │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            PLAYER WALLET SERVICE                                        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  createWallet()   → MPC Wallet Generation                                              │
│  getBalance()     → On-chain Balance Query                                             │
│  deposit()        → External Deposit                                                   │
│  withdraw()       → MPC-Signed Withdrawal                                              │
│  transfer()       → Internal Transfer                                                  │
│  lockFunds()      → Match Entry Lock                                                   │
│  unlockFunds()    → Release Locked Funds                                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          PRIZE DISTRIBUTION SERVICE                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  calculatePrizes()        → Prize Pool Calculation                                     │
│  distributePrizes()       → Multi-recipient Transfer                                   │
│  applyPlatformFee()       → Fee Deduction                                              │
│  createDistributionPlan() → Payout Schedule                                            │
│  executeDistribution()    → Batch Transfer                                             │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              TOURNAMENT SERVICE                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  createTournament()     → Tournament Setup                                             │
│  registerPlayer()       → Registration + Fee                                           │
│  generateBracket()      → Bracket Generation                                           │
│  advanceRound()         → Round Progression                                            │
│  finalizeTournament()   → Final Rankings                                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Entity Definitions

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ENTITY RELATIONSHIPS                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

  PlayerWallet ──┬── 1:N ──▶ WalletTransaction
                 │
                 ├── 1:N ──▶ MatchParticipant
                 │
                 └── N:1 ──▶ MpcWallet (secured by)

  Match ─────────┬── 1:N ──▶ MatchParticipant
                 │
                 ├── 1:1 ──▶ EscrowAccount (funds)
                 │
                 └── 1:1 ──▶ PrizeDistribution (generates)

  Tournament ────┬── 1:N ──▶ TournamentRegistration
                 │
                 ├── 1:N ──▶ Match (contains)
                 │
                 └── 1:1 ──▶ EscrowAccount (funds)

  EscrowAccount ─┴── 1:N ──▶ EscrowTransaction (logs)


┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                  PLAYER WALLET                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  playerId            string       UK                                                    │
│  mpcWalletId         string       FK                                                    │
│  publicKey           string                                                             │
│  availableBalance    bigint                                                             │
│  lockedBalance       bigint                                                             │
│  status              enum         [ACTIVE, LOCKED, SUSPENDED]                           │
│  createdAt           timestamp                                                          │
│  updatedAt           timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                WALLET TRANSACTION                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  walletId            uuid         FK                                                    │
│  type                enum         [DEPOSIT, WITHDRAWAL, ENTRY_FEE, PRIZE, REFUND]       │
│  amount              bigint                                                             │
│  signature           string                                                             │
│  reference           string                                                             │
│  status              enum         [PENDING, COMPLETED, FAILED]                          │
│  createdAt           timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                      MATCH                                               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  matchId             string       UK                                                    │
│  gameType            enum         [DUEL, TEAM, BATTLE_ROYALE, FFA]                      │
│  entryFee            bigint                                                             │
│  maxPlayers          int                                                                │
│  minPlayers          int                                                                │
│  prizePool           bigint                                                             │
│  platformFeePercent  decimal                                                            │
│  status              enum         [CREATED, WAITING, READY, IN_PROGRESS, COMPLETED...]  │
│  winnerId            uuid         FK                                                    │
│  escrowAddress       string                                                             │
│  metadata            jsonb                                                              │
│  scheduledAt         timestamp                                                          │
│  startedAt           timestamp                                                          │
│  endedAt             timestamp                                                          │
│  createdAt           timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                               MATCH PARTICIPANT                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  matchId             uuid         FK                                                    │
│  walletId            uuid         FK                                                    │
│  status              enum         [PENDING, JOINED, READY, PLAYING, FINISHED...]        │
│  placement           int                                                                │
│  prizeWon            bigint                                                             │
│  entrySignature      string                                                             │
│  joinedAt            timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TOURNAMENT                                            │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  tournamentId        string       UK                                                    │
│  name                string                                                             │
│  gameType            enum                                                               │
│  entryFee            bigint                                                             │
│  prizePool           bigint                                                             │
│  maxParticipants     int                                                                │
│  bracketType         enum         [SINGLE_ELIMINATION, DOUBLE_ELIMINATION, ROUND_ROBIN] │
│  status              enum         [DRAFT, REGISTRATION_OPEN, IN_PROGRESS, COMPLETED...] │
│  prizeStructure      jsonb                                                              │
│  registrationStart   timestamp                                                          │
│  registrationEnd     timestamp                                                          │
│  startDate           timestamp                                                          │
│  endDate             timestamp                                                          │
│  createdAt           timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            TOURNAMENT REGISTRATION                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  tournamentId        uuid         FK                                                    │
│  walletId            uuid         FK                                                    │
│  seed                int                                                                │
│  status              enum         [PENDING, CONFIRMED, CHECKED_IN, ELIMINATED, WINNER]  │
│  paymentSignature    string                                                             │
│  registeredAt        timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ESCROW ACCOUNT                                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  escrowId            string       UK                                                    │
│  escrowAddress       string                                                             │
│  sourceType          string       [MATCH, TOURNAMENT]                                   │
│  sourceId            uuid                                                               │
│  totalDeposited      bigint                                                             │
│  totalReleased       bigint                                                             │
│  currentBalance      bigint                                                             │
│  status              enum         [CREATED, ACTIVE, LOCKED, RELEASED, REFUNDED]         │
│  createdAt           timestamp                                                          │
│  closedAt            timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              ESCROW TRANSACTION                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                    uuid       PK                                                    │
│  escrowId              uuid       FK                                                    │
│  type                  enum       [DEPOSIT, RELEASE, REFUND, FEE]                       │
│  participantWalletId   uuid       FK                                                    │
│  amount                bigint                                                           │
│  signature             string                                                           │
│  createdAt             timestamp                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRIZE DISTRIBUTION                                          │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  id                  uuid         PK                                                    │
│  matchId             uuid         FK (nullable)                                         │
│  tournamentId        uuid         FK (nullable)                                         │
│  totalPrizePool      bigint                                                             │
│  platformFee         bigint                                                             │
│  distributedAmount   bigint                                                             │
│  status              enum         [PENDING, PROCESSING, COMPLETED, PARTIAL, FAILED]     │
│  distributions       jsonb        [{playerId, amount, placement, status}]               │
│  distributedAt       timestamp                                                          │
│  createdAt           timestamp                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## MPC Integration for Player Wallets

### Wallet Creation Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              WALLET CREATION SEQUENCE                                     │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  Client              API               PWS               MPC               DB         Solana
    │                  │                 │                 │                 │            │
    │  POST /wallets   │                 │                 │                 │            │
    │─────────────────▶│                 │                 │                 │            │
    │                  │ createPlayer    │                 │                 │            │
    │                  │   Wallet()      │                 │                 │            │
    │                  │────────────────▶│                 │                 │            │
    │                  │                 │ createMpcWallet │                 │            │
    │                  │                 │  (2-of-3)       │                 │            │
    │                  │                 │────────────────▶│                 │            │
    │                  │                 │                 │ generateDist-   │            │
    │                  │                 │                 │   ributedKey()  │            │
    │                  │                 │                 │────────┐        │            │
    │                  │                 │                 │        │        │            │
    │                  │                 │                 │◀───────┘        │            │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │ createKeyShares │            │
    │                  │                 │                 │  (player,       │            │
    │                  │                 │                 │   platform,     │            │
    │                  │                 │                 │   recovery)     │            │
    │                  │                 │                 │────────┐        │            │
    │                  │                 │                 │        │        │            │
    │                  │                 │                 │◀───────┘        │            │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │ save(MpcWallet, │            │
    │                  │                 │                 │  KeyShares)     │            │
    │                  │                 │                 │────────────────▶│            │
    │                  │                 │                 │                 │            │
    │                  │                 │ MpcWalletResp   │                 │            │
    │                  │                 │◀────────────────│                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ deriveAddress   │                 │            │
    │                  │                 │  (publicKey)    │                 │            │
    │                  │                 │─────────────────────────────────────────────────▶│
    │                  │                 │                 │                 │            │
    │                  │                 │ save(PlayerWallet)                │            │
    │                  │                 │────────────────────────────────▶│            │
    │                  │                 │                 │                 │            │
    │                  │ PlayerWallet    │                 │                 │            │
    │                  │   Response      │                 │                 │            │
    │                  │◀────────────────│                 │                 │            │
    │  201 Created     │                 │                 │                 │            │
    │◀─────────────────│                 │                 │                 │            │
    │                  │                 │                 │                 │            │
```

### MPC Threshold Signing

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            MPC THRESHOLD SIGNING SEQUENCE                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  Client              API               PWS               MPC              HSM         Solana
    │                  │                 │                 │                 │            │
    │ POST /withdraw   │                 │                 │                 │            │
    │─────────────────▶│                 │                 │                 │            │
    │                  │ withdraw()      │                 │                 │            │
    │                  │────────────────▶│                 │                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ validateWith-   │                 │            │
    │                  │                 │   drawal()      │                 │            │
    │                  │                 │────────┐        │                 │            │
    │                  │                 │        │        │                 │            │
    │                  │                 │◀───────┘        │                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ buildTx()       │                 │            │
    │                  │                 │────────┐        │                 │            │
    │                  │                 │        │        │                 │            │
    │                  │                 │◀───────┘        │                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ requestSig()    │                 │            │
    │                  │                 │────────────────▶│                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │   ┌─────────────────────┐    │
    │                  │                 │                 │   │ PARALLEL SIGNING    │    │
    │                  │                 │                 │   └─────────────────────┘    │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │ requestShare    │            │
    │                  │                 │                 │   (player)      │            │
    │                  │                 │                 │────────────────▶│            │
    │                  │                 │                 │ signatureShare1 │            │
    │                  │                 │                 │◀────────────────│            │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │ requestShare    │            │
    │                  │                 │                 │   (platform)    │            │
    │                  │                 │                 │────────────────▶│            │
    │                  │                 │                 │ signatureShare2 │            │
    │                  │                 │                 │◀────────────────│            │
    │                  │                 │                 │                 │            │
    │                  │                 │                 │ reconstruct-    │            │
    │                  │                 │                 │   Signature()   │            │
    │                  │                 │                 │────────┐        │            │
    │                  │                 │                 │        │        │            │
    │                  │                 │                 │◀───────┘        │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ completeSig     │                 │            │
    │                  │                 │◀────────────────│                 │            │
    │                  │                 │                 │                 │            │
    │                  │                 │ sendTransaction │                 │            │
    │                  │                 │─────────────────────────────────────────────────▶│
    │                  │                 │                 │                 │ signature  │
    │                  │                 │◀─────────────────────────────────────────────────│
    │                  │                 │                 │                 │            │
    │                  │ WithdrawalResp  │                 │                 │            │
    │                  │◀────────────────│                 │                 │            │
    │  200 OK          │                 │                 │                 │            │
    │◀─────────────────│                 │                 │                 │            │
```

---

## Match Flow

### Monetized Match Lifecycle

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               MATCH STATE MACHINE                                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘

                                  createMatch()
                                       │
                                       ▼
                               ┌───────────────┐
                               │    CREATED    │
                               └───────┬───────┘
                                       │ match published
                                       ▼
                               ┌───────────────┐     timeout/cancel
                               │    WAITING    │─────────────────────┐
                               └───────┬───────┘                     │
                                       │ minPlayers joined           │
                                       ▼                             │
                               ┌───────────────┐     cancel req      │
                               │     READY     │─────────────────────┤
                               └───────┬───────┘                     │
                                       │ startMatch()                │
                                       ▼                             │
                               ┌───────────────┐                     │
                               │   STARTING    │                     │
                               └───────┬───────┘                     │
                                       │ all fees escrowed           │
                                       ▼                             │
                               ┌───────────────┐                     │
                               │  IN_PROGRESS  │                     │
                               └───────┬───────┘                     │
                         ┌─────────────┼─────────────┐               │
                         │             │             │               │
              submitResult()     dispute raised      │               │
                         │             │             │               │
                         ▼             ▼             │               │
                ┌────────────┐  ┌───────────┐       │               │
                │ COMPLETED  │  │ DISPUTED  │       │               │
                └──────┬─────┘  └─────┬─────┘       │               │
                       │              │             │               │
                       │    ┌─────────┴─────────┐   │               │
                       │    │                   │   │               │
                       │ resolved           upheld  │               │
                       │    │                   │   │               │
                       │    ▼                   ▼   │               │
                       │ ┌──────────┐     ┌──────────┐              │
                       └▶│COMPLETED │     │CANCELLED │◀─────────────┘
                         └────┬─────┘     └──────────┘
                              │
                              │ prizes distributed
                              ▼
                         ┌──────────┐
                         │ SETTLED  │
                         └──────────┘
                              │
                              ▼
                            [END]
```

### Entry Fee & Escrow Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           ENTRY FEE & ESCROW SEQUENCE                                    │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  Player1     Player2       API          MMS          ECS          PWS          MPC       Solana
    │           │            │            │            │            │            │           │
    │           │            │            │            │            │            │           │
    │  ════════════════════════════ MATCH CREATION ════════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │ POST /matches          │            │            │            │            │           │
    │  (entryFee: 10 SOL)    │            │            │            │            │           │
    │───────────────────────▶│            │            │            │            │           │
    │           │            │ createMatch │           │            │            │           │
    │           │            │───────────▶│            │            │            │           │
    │           │            │            │ createEscrow            │            │           │
    │           │            │            │───────────▶│            │            │           │
    │           │            │            │            │ createEscrowAccount     │           │
    │           │            │            │            │────────────────────────────────────▶│
    │           │            │            │            │            │            │ address   │
    │           │            │            │            │◀────────────────────────────────────│
    │           │            │ MatchResp  │            │            │            │           │
    │◀───────────────────────│            │            │            │            │           │
    │           │            │            │            │            │            │           │
    │  ════════════════════════════ PLAYER 1 JOINS ════════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │ POST /matches/:id/join │            │            │            │            │           │
    │───────────────────────▶│            │            │            │            │           │
    │           │            │ joinMatch  │            │            │            │           │
    │           │            │───────────▶│            │            │            │           │
    │           │            │            │ lockFunds(P1, 10 SOL)   │            │           │
    │           │            │            │────────────────────────▶│            │           │
    │           │            │            │            │            │ validateBal│           │
    │           │            │            │            │            │───────┐    │           │
    │           │            │            │            │            │       │    │           │
    │           │            │            │            │            │◀──────┘    │           │
    │           │            │            │            │            │ signTx     │           │
    │           │            │            │            │            │───────────▶│           │
    │           │            │            │            │            │   signedTx │           │
    │           │            │            │            │            │◀───────────│           │
    │           │            │            │            │            │ sendTx     │           │
    │           │            │            │            │            │──────────────────────▶│
    │           │            │            │            │            │            │ signature │
    │           │            │            │            │            │◀──────────────────────│
    │           │            │            │ depositToEscrow(10 SOL) │            │           │
    │           │            │            │───────────▶│            │            │           │
    │           │            │ JoinResp   │            │            │            │           │
    │◀───────────────────────│            │            │            │            │           │
    │           │            │            │            │            │            │           │
    │  ════════════════════════════ PLAYER 2 JOINS ════════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │           │ POST /join │            │            │            │            │           │
    │           │───────────▶│            │            │            │            │           │
    │           │            │ joinMatch  │            │            │            │           │
    │           │            │───────────▶│            │            │            │           │
    │           │            │            │ lockFunds(P2, 10 SOL)   │            │           │
    │           │            │            │────────────────────────▶│            │           │
    │           │            │            │            │            │ signTx     │           │
    │           │            │            │            │            │───────────▶│           │
    │           │            │            │            │            │◀───────────│           │
    │           │            │            │            │            │ sendTx     │           │
    │           │            │            │            │            │──────────────────────▶│
    │           │            │            │ depositToEscrow(10 SOL) │            │           │
    │           │            │            │───────────▶│            │            │           │
    │           │ JoinResp   │            │            │            │            │           │
    │           │◀───────────│            │            │            │            │           │
    │           │            │            │            │            │            │           │
    │  ════════════════════════════ MATCH EXECUTION ═══════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │           │            │ startMatch │            │            │            │           │
    │           │            │───────────▶│            │            │            │           │
    │           │            │            │ lockEscrow │            │            │           │
    │           │            │            │───────────▶│            │            │           │
    │           │            │            │            │            │            │           │
    │  ════════════════════════ [MATCH IS PLAYED] ═════════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │  ════════════════════════════ RESULT & PRIZES ═══════════════════════════════════    │
    │           │            │            │            │            │            │           │
    │           │            │ submitResult(winner: P1)│            │            │           │
    │           │            │───────────▶│            │            │            │           │
    │           │            │            │ validateResult          │            │           │
    │           │            │            │───────┐    │            │            │           │
    │           │            │            │       │    │            │            │           │
    │           │            │            │◀──────┘    │            │            │           │
    │           │            │            │ releaseEscrow           │            │           │
    │           │            │            │───────────▶│            │            │           │
    │           │            │            │            │            │            │           │
    │           │            │            │  ┌─────────────────────────────────────────┐    │
    │           │            │            │  │ PRIZE CALCULATION                       │    │
    │           │            │            │  │  Total Pool:    20 SOL                  │    │
    │           │            │            │  │  Platform Fee:   1 SOL (5%)             │    │
    │           │            │            │  │  Winner Prize:  19 SOL                  │    │
    │           │            │            │  └─────────────────────────────────────────┘    │
    │           │            │            │            │            │            │           │
    │           │            │            │            │ signDistribution        │           │
    │           │            │            │            │────────────────────────▶│           │
    │           │            │            │            │            │   signedTx │           │
    │           │            │            │            │◀────────────────────────│           │
    │           │            │            │            │ sendTx     │            │           │
    │           │            │            │            │──────────────────────────────────▶│
    │           │            │            │            │            │            │signature │
    │           │            │            │            │◀──────────────────────────────────│
    │           │            │            │            │ creditWallet(P1, 19 SOL)│           │
    │           │            │            │            │────────────▶│           │           │
    │           │            │ ResultResp │            │            │            │           │
    │◀───────────────────────│            │            │            │            │           │
    │           │◀───────────│ (winner)   │            │            │            │           │
    │           │  (loser)   │            │            │            │            │           │
```

---

## Tournament Structure

### Bracket Generation

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                     SINGLE ELIMINATION BRACKET (8 PLAYERS)                               │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    Round 1 (Quarterfinals)          Semifinals              Grand Final
    
    ┌─────────────┐
    │ P1 (Seed 1) │──────┐
    └─────────────┘      │
                         ├───────┐
    ┌─────────────┐      │       │
    │ P8 (Seed 8) │──────┘       │
    └─────────────┘               │
                                  ├──────────┐
    ┌─────────────┐               │          │
    │ P4 (Seed 4) │──────┐       │          │
    └─────────────┘      │       │          │
                         ├───────┘          │
    ┌─────────────┐      │                  │
    │ P5 (Seed 5) │──────┘                  │
    └─────────────┘                         │
                                            ├──────────▶ CHAMPION
    ┌─────────────┐                         │
    │ P2 (Seed 2) │──────┐                  │
    └─────────────┘      │                  │
                         ├───────┐          │
    ┌─────────────┐      │       │          │
    │ P7 (Seed 7) │──────┘       │          │
    └─────────────┘               │          │
                                  ├──────────┘
    ┌─────────────┐               │
    │ P3 (Seed 3) │──────┐       │
    └─────────────┘      │       │
                         ├───────┘
    ┌─────────────┐      │
    │ P6 (Seed 6) │──────┘
    └─────────────┘


┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              PRIZE DISTRIBUTION                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────┐
    │  Placement      │  Percentage  │  Example (100 SOL)   │
    ├────────────────────────────────────────────────────────┤
    │  1st Place      │     50%      │      47.5 SOL        │
    │  2nd Place      │     25%      │      23.75 SOL       │
    │  3rd/4th Place  │   10% each   │      9.5 SOL each    │
    │  Platform Fee   │      5%      │       5 SOL          │
    └────────────────────────────────────────────────────────┘
```

### Tournament Flow

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                              TOURNAMENT FLOW SEQUENCE                                    │
└──────────────────────────────────────────────────────────────────────────────────────────┘

  Admin       Players        API          TMS          MMS          ECS          PDS       Solana
    │           │             │            │            │            │            │           │
    │  ═══════════════════════════ TOURNAMENT SETUP ═══════════════════════════════════    │
    │           │             │            │            │            │            │           │
    │ POST /tournaments       │            │            │            │            │           │
    │────────────────────────▶│            │            │            │            │           │
    │           │             │ createTournament        │            │            │           │
    │           │             │───────────▶│            │            │            │           │
    │           │             │            │ createEscrow            │            │           │
    │           │             │            │─────────────────────────▶│            │           │
    │           │             │ TournamentResp          │            │            │           │
    │◀────────────────────────│            │            │            │            │           │
    │           │             │            │            │            │            │           │
    │  ═══════════════════════════ REGISTRATION PHASE ═════════════════════════════════    │
    │           │             │            │            │            │            │           │
    │           │  ┌──────────────────────────────────────────────────────────────────┐    │
    │           │  │  LOOP: Each Player Registration                                  │    │
    │           │  └──────────────────────────────────────────────────────────────────┘    │
    │           │             │            │            │            │            │           │
    │           │ POST /register           │            │            │            │           │
    │           │────────────▶│            │            │            │            │           │
    │           │             │ registerPlayer          │            │            │           │
    │           │             │───────────▶│            │            │            │           │
    │           │             │            │ depositToEscrow(fee)    │            │           │
    │           │             │            │─────────────────────────▶│            │           │
    │           │             │ RegistrationResp        │            │            │           │
    │           │◀────────────│            │            │            │            │           │
    │           │             │            │            │            │            │           │
    │  ═══════════════════════════ BRACKET GENERATION ═════════════════════════════════    │
    │           │             │            │            │            │            │           │
    │ POST /bracket           │            │            │            │            │           │
    │────────────────────────▶│            │            │            │            │           │
    │           │             │ generateBracket         │            │            │           │
    │           │             │───────────▶│            │            │            │           │
    │           │             │            │ seedPlayers(byRanking)  │            │           │
    │           │             │            │───────┐    │            │            │           │
    │           │             │            │       │    │            │            │           │
    │           │             │            │◀──────┘    │            │            │           │
    │           │             │            │ createMatch(round1)     │            │           │
    │           │             │            │───────────▶│            │            │           │
    │           │             │ BracketResp│            │            │            │           │
    │◀────────────────────────│            │            │            │            │           │
    │           │             │            │            │            │            │           │
    │  ═══════════════════════════ TOURNAMENT EXECUTION ═══════════════════════════════    │
    │           │             │            │            │            │            │           │
    │           │  ┌──────────────────────────────────────────────────────────────────┐    │
    │           │  │  LOOP: Each Round                                                │    │
    │           │  │   ┌─────────────────────────────────────────────────────────┐    │    │
    │           │  │   │ LOOP: Each Match in Round                               │    │    │
    │           │  │   └─────────────────────────────────────────────────────────┘    │    │
    │           │  └──────────────────────────────────────────────────────────────────┘    │
    │           │             │            │            │            │            │           │
    │           │             │            │            │ executeMatch()          │           │
    │           │             │            │            │───────┐    │            │           │
    │           │             │            │            │       │    │            │           │
    │           │             │            │            │◀──────┘    │            │           │
    │           │             │            │            │ reportResult            │           │
    │           │             │            │◀───────────│            │            │           │
    │           │             │            │            │            │            │           │
    │           │             │            │ advanceWinners          │            │           │
    │           │             │            │───────┐    │            │            │           │
    │           │             │            │       │    │            │            │           │
    │           │             │            │◀──────┘    │            │            │           │
    │           │             │            │ createMatch(nextRound)  │            │           │
    │           │             │            │───────────▶│            │            │           │
    │           │             │            │            │            │            │           │
    │  ═══════════════════════════ PRIZE DISTRIBUTION ═════════════════════════════════    │
    │           │             │            │            │            │            │           │
    │           │             │            │ distributePrizes        │            │           │
    │           │             │            │──────────────────────────────────────▶│           │
    │           │             │            │            │            │ calculate  │           │
    │           │             │            │            │            │───────┐    │           │
    │           │             │            │            │            │       │    │           │
    │           │             │            │            │            │◀──────┘    │           │
    │           │             │            │            │ releaseEscrow          │           │
    │           │             │            │            │◀───────────│            │           │
    │           │             │            │            │            │            │           │
    │           │  ┌──────────────────────────────────────────────────────────────────┐    │
    │           │  │  LOOP: Each Winner                                               │    │
    │           │  └──────────────────────────────────────────────────────────────────┘    │
    │           │             │            │            │            │ transfer   │           │
    │           │             │            │            │────────────────────────────────────▶│
    │           │             │            │            │            │            │           │
    │           │             │            │ DistributionComplete    │            │           │
    │           │             │            │◀──────────────────────────────────────│           │
```

---

## Security Model

### Access Control

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                ACCESS CONTROL MODEL                                      │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    AUTHENTICATION LAYER                    AUTHORIZATION POLICIES
    ┌───────────────────┐                   ┌───────────────────┐
    │     JWT Token     │                   │   Wallet Owner    │
    ├───────────────────┤                   ├───────────────────┤
    │ Wallet Signature  │                   │  Platform Admin   │
    ├───────────────────┤                   ├───────────────────┤
    │  Multi-Factor     │                   │  System Service   │
    │  Authentication   │                   │                   │
    └─────────┬─────────┘                   └─────────┬─────────┘
              │                                       │
              └──────────────────┬────────────────────┘
                                 │
                                 ▼
    ┌──────────────────────────────────────────────────────────────────────────────────────┐
    │                           PROTECTED OPERATIONS                                       │
    ├──────────────────────────────────────────────────────────────────────────────────────┤
    │                                                                                      │
    │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐            │
    │   │  Create Wallet   │     │   Create Match   │     │Create Tournament │            │
    │   │   [OWNER]        │     │    [OWNER]       │     │   [ADMIN]        │            │
    │   └──────────────────┘     └──────────────────┘     └──────────────────┘            │
    │                                                                                      │
    │   ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐            │
    │   │ Withdraw Funds   │     │  Submit Result   │     │ Distribute Prizes│            │
    │   │   [OWNER+MFA]    │     │   [ADMIN]        │     │  [ADMIN/SYSTEM]  │            │
    │   └──────────────────┘     └──────────────────┘     └──────────────────┘            │
    │                                                                                      │
    └──────────────────────────────────────────────────────────────────────────────────────┘
```

### MPC Security Guarantees

| Property | Implementation |
|----------|----------------|
| Key Never Reconstructed | Threshold signing without key assembly |
| Distributed Trust | 2-of-3 scheme: player + platform + recovery |
| Compromise Resistance | Single share compromise insufficient |
| Recovery | Recovery share held in cold storage |
| Audit Trail | All signing operations logged |
| Rate Limiting | Withdrawal limits and cooling periods |

### Escrow Security

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ESCROW SECURITY                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘

    ESCROW ACCOUNT CONTROLS                     FUND PROTECTION
    ┌───────────────────────┐                   ┌───────────────────────┐
    │  PDA-Based Address    │ ─────────────────▶│ Immediate Deposit Lock│
    └───────────────────────┘                   └───────────────────────┘
    ┌───────────────────────┐                   ┌───────────────────────┐
    │  Multi-sig Release    │ ─────────────────▶│ No Partial Withdrawals│
    └───────────────────────┘                   └───────────────────────┘
    ┌───────────────────────┐                   ┌───────────────────────┐
    │  Time-Locked Refunds  │ ─────────────────▶│ Atomic Distribution   │
    └───────────────────────┘                   └───────────────────────┘
    ┌───────────────────────┐                   ┌───────────────────────┐
    │  Dispute Resolution   │ ─────────────────▶│ Platform Fee Separate │
    └───────────────────────┘                   └───────────────────────┘
```

---

## Configuration

### Environment Variables

```
# Solana Configuration
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WS_URL=wss://api.mainnet-beta.solana.com

# MPC Configuration
MPC_THRESHOLD_SCHEME=2-of-3
MPC_KEY_ROTATION_DAYS=90
MPC_SIGNING_TIMEOUT_MS=30000

# Esports Configuration
ESPORTS_PLATFORM_FEE_PERCENT=5
ESPORTS_MIN_ENTRY_FEE_LAMPORTS=1000000
ESPORTS_MAX_ENTRY_FEE_LAMPORTS=100000000000
ESPORTS_MATCH_TIMEOUT_MINUTES=60
ESPORTS_ESCROW_PROGRAM_ID=<program_id>

# Rate Limits
WITHDRAWAL_DAILY_LIMIT_LAMPORTS=10000000000
WITHDRAWAL_COOLDOWN_SECONDS=300
```

---

## Error Handling

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `INSUFFICIENT_BALANCE` | Player wallet balance too low | Deposit funds before joining |
| `MATCH_FULL` | Maximum players reached | Join different match |
| `MATCH_NOT_READY` | Not enough players | Wait for more players |
| `ESCROW_LOCKED` | Match in progress | Cannot withdraw during match |
| `INVALID_RESULT` | Result validation failed | Provide valid proof |
| `MPC_SIGNING_FAILED` | Threshold not met | Retry with required shares |
| `WITHDRAWAL_LIMIT` | Daily limit exceeded | Wait for reset |

---

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                            MONITORING & OBSERVABILITY                                    │
└──────────────────────────────────────────────────────────────────────────────────────────┘

         METRICS                         ALERTS                      DASHBOARDS
    ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
    │ Match Creation  │            │Failed Distribute│            │    Grafana      │
    │     Rate        │───────────▶│   Alerts        │───────────▶│  Operations     │
    └─────────────────┘            └─────────────────┘            └─────────────────┘
    ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
    │  Entry Fee      │            │    Escrow       │            │    Grafana      │
    │    Volume       │───────────▶│   Imbalance     │───────────▶│   Financial     │
    └─────────────────┘            └─────────────────┘            └─────────────────┘
    ┌─────────────────┐            ┌─────────────────┐            ┌─────────────────┐
    │    Prize        │            │  MPC Signing    │            │     Jaeger      │
    │Distribution Lat │───────────▶│   Failures      │───────────▶│    Tracing      │
    └─────────────────┘            └─────────────────┘            └─────────────────┘
    ┌─────────────────┐            ┌─────────────────┐
    │  MPC Signing    │            │   Unusual       │
    │   Duration      │───────────▶│  Withdrawals    │
    └─────────────────┘            └─────────────────┘
    ┌─────────────────┐
    │    Escrow       │
    │    Balance      │
    └─────────────────┘
```

---

## References

- [Solana SPL Token Program](https://spl.solana.com/token)
- [Threshold Signature Schemes](https://en.wikipedia.org/wiki/Threshold_cryptosystem)
- [Shamir's Secret Sharing](https://en.wikipedia.org/wiki/Shamir%27s_Secret_Sharing)
- [MPC Module](./08-mpc.md)
- [Transaction Processing](./02-transactions-instructions.md)
- [Token Standards](./03-token-standards.md)
