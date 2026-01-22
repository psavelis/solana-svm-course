# Solana SVM Study Repository

A learning and implementation platform for Solana and SVM (Solana Virtual Machine) development, designed for developers transitioning from EVM-based chains like Ethereum and Polygon.

## 📚 Complete Course PDF

**📕 [Download Complete Course PDF](marp/solana-svm-study-course-complete-2026-01-22T12-10-05.pdf)** - Full slide deck covering all topics below (19 modules, 5.17 MB)

## Course Topics

### Module 1: Accounts & Programs
- Account model fundamentals (vs EVM's account model)
- Program Derived Addresses (PDAs)
- Account ownership and rent
- Data serialization with Borsh

### Module 2: Transactions & Instructions
- Transaction anatomy and lifecycle
- Instruction structure and encoding
- Transaction fees and compute units
- Versioned transactions

### Module 3: Token Standards
- SPL Token Program
- Token accounts and mints
- Associated Token Accounts (ATAs)
- Token-2022 extensions

### Module 4: Account Abstraction
- Native account abstraction on Solana
- Multisig patterns
- Durable nonces for offline signing
- Session keys implementation

### Module 5: Fee Mechanism
- Priority fees and compute budget
- Fee estimation strategies
- Dynamic fee adjustment
- Conservative, balanced, aggressive, predictive, and adaptive strategies

### Module 6: Consensus & Validation
- Proof of History (PoH)
- Tower BFT consensus
- Validator architecture
- Slot and epoch mechanics

### Module 7: Signing & Cryptography
- Ed25519 signatures
- Keypair management
- Hardware wallet integration
- Message signing and verification

### Module 8: Multi-Party Computation (MPC)
- Threshold signature schemes (TSS)
- 2-of-3, 3-of-5, 4-of-7 configurations
- Distributed key generation
- Secure multi-party signing

### Module 9: Solana Virtual Machine (SVM)
- BPF bytecode execution
- Runtime environment
- Syscalls and CPI
- Memory model and constraints

### Module 10: Cross-Program Invocations (CPIs)
- CPI mechanics and patterns
- Signer privileges propagation
- PDA signing in CPIs
- Security considerations

### Module 11: Events & Logging
- Program logs and events
- Log parsing and indexing
- Real-time event monitoring
- Historical event queries

### Module 12: Security Practices
- Common vulnerabilities
- Signer verification patterns
- Reentrancy prevention
- Arithmetic overflow protection

### Module 13: Development Tools
- Solana CLI and toolchain
- Anchor framework overview
- Local test validator
- Debugging and profiling

### Module 14: Network Architecture
- Cluster topology
- RPC nodes and validators
- Gossip protocol
- Transaction propagation

### Module 15: Advanced Features
- Lookup tables (ALTs)
- Compute budget optimization
- Parallel transaction execution
- Jupiter aggregator integration

### Module 16: Esports Matchmaking Platform
- **Security Concepts**:
  - Collusion detection and prevention
  - Sybil attack mitigations
  - Escrow system design
  - Prize manipulation prevention
  - Entry fee validation
  - Deterministic addressing (PDA-style)
  - Rate limiting strategies
  - Audit trail implementation
- **Multi-Token Support**: SOL, USDC, USDT, PYUSD, WSOL
- **MPC Wallet Integration**: 2-of-3 threshold player wallets
- **Matchmaking System**: Entry fees, escrow, prize pools
- **Prize Distribution**: Winner takes all, top 3 split, MVP bonus strategies
- **Tournament Management**: Bracket generation, registration, settlement

---

## Overview

This repository implements a NestJS-based API service that demonstrates Solana integrations, featuring:
- PostgreSQL database for data persistence
- Kafka for asynchronous messaging
- Docker Compose for containerized deployment
- Solana feature implementations
- Built for business architecture following SOLID principles

## Study Materials

📚 **[Complete Course Curriculum](docs/COURSE.md)** - In-depth 16-week learning path

📖 **[Study Guide](docs/STUDY.md)** - Breakdown of Solana concepts with EVM comparisons

📋 **[Project Overview](docs/PROJECT.md)** - Project objectives, design patterns, and architecture

📝 **[Implementation Tasks](docs/TASKS.md)** - Detailed task breakdown for all features

🎓 **[Slide Decks](marp/README.md)** - Individual module presentations

## Architecture

### Design Principles
- SOLID: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- DRY: Don't Repeat Yourself
- YAGNI: You Aren't Gonna Need It
- KISS: Keep It Simple, Stupid
- Object Calisthenics: 9 rules for clean object-oriented code
- High Code Coverage: >80% test coverage maintained

### Technology Stack
- Backend: NestJS (Node.js framework)
- Database: PostgreSQL
- Message Queue: Apache Kafka
- Caching: Redis
- Blockchain: Solana Web3.js, SVM integrations, Local Test Validator
- Containerization: Docker & Docker Compose
- Orchestration: Kubernetes
- Monitoring: Prometheus & Grafana
- Testing: Jest with code coverage reporting

## Infrastructure

🏗️ **[Infrastructure Guide](infra/README.md)** - Kubernetes manifests, monitoring setup, and deployment instructions

### Local Development
- Docker Compose for containerized services
- Hot reload development server
- Integrated health checks

### Production Deployment
- Kubernetes manifests for cloud-native deployment
- Persistent storage for databases
- Service mesh configuration
- Monitoring and observability stack

## Quick Start

### Prerequisites
- Node.js 22+ (LTS)
- Docker & Docker Compose
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/psavelis/solana-svm-study.git
cd solana-svm-study
```

2. Install dependencies:
```bash
npm install
```

3. Start the services (including local Solana validator):
```bash
docker-compose up -d
```

4. Wait for Solana validator to initialize (may take 1-2 minutes):
```bash
docker-compose logs solana-validator
```

5. Run the application:
```bash
npm run start:dev
```

### Environment Setup

Create a `.env` file with the following variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/solana_study
KAFKA_BROKERS=localhost:9092
SOLANA_RPC_URL=http://localhost:8899
SOLANA_WS_URL=ws://localhost:8900
SOLANA_FAUCET_URL=http://localhost:9900
SOLANA_NETWORK=local
SOLANA_PRIVATE_KEY=your_private_key_here
REDIS_URL=redis://localhost:6379
```

## API Documentation

Once running, access the API documentation at `http://localhost:3000/api`

### Health Checks
- `GET /health` - In-depth health check for all services (database, Kafka, Redis)

### Database APIs

#### Migration Management
- `GET /migrations` - List all migrations with execution status
- `GET /migrations/stats` - Migration statistics and summary
- `POST /migrations/run` - Execute pending migrations
- `POST /migrations/rollback` - Rollback last migration
- `POST /migrations/create` - Generate new migration files

#### Connection Pooling
- `GET /database/health` - In-depth database health status
- `GET /database/pool/stats` - Connection pool statistics and utilization
- `GET /database/info` - Database connection information
- `GET /database/health/check` - Manual health check
- `GET /database/connections/count` - Current connection count
- `POST /database/pool/close-idle` - Close idle connections

#### Database Performance
- `GET /database/performance/report` - In-depth performance analysis
- `GET /database/performance/config/recommendations` - PostgreSQL configuration guidance
- `GET /database/performance/index/recommendations` - Index optimization suggestions
- `POST /database/performance/query/analyze` - Individual query performance analysis

#### Transaction Event Publishing
- `POST /transactions/events/test` - Create test transaction to demonstrate event publishing
- `POST /transactions/:id/events/status-update` - Update transaction status and publish event
- `GET /transactions/events/publisher/status` - Get message publisher buffer status
- `POST /transactions/events/publisher/flush` - Force flush buffered events

For detailed information, see [Database Migration Documentation](src/database/README.md), [Connection Pooling Documentation](src/database/CONNECTION_POOLING.md), [Performance Optimization Documentation](src/database/PERFORMANCE_OPTIMIZATION.md), and [Transaction Event Publishing Documentation](src/modules/transactions/README.md).

## Key Features

### Solana Integrations
- Account management and PDAs
- Token operations (SPL tokens)
- Transaction building and signing
- Program interactions
- Event monitoring

### Advanced Capabilities
- **Multi-Party Computation (MPC)**: Threshold cryptography for secure distributed signing
  - 2-of-3, 3-of-5, and 4-of-7 threshold schemes
  - Distributed key generation and share management
  - Secure transaction signing across multiple participants
  - Key share recovery and revocation mechanisms
- Account abstraction patterns
- **Fee Optimization**: Advanced fee strategies with dynamic adjustment
  - Conservative, balanced, aggressive, predictive, and adaptive strategies
  - Real-time network congestion analysis
  - Historical fee pattern analysis
  - User preference-based optimization
- Cross-program invocations

### Database Management
- **Schema Migrations**: Version-controlled database schema changes
- **Migration Tracking**: Automatic tracking of executed migrations
- **Rollback Support**: Safe rollback of schema changes
- **Migration API**: REST endpoints for migration management
- **CLI Tools**: TypeORM CLI integration for development workflow
- **Connection Pooling**: Optimized PostgreSQL connection management
- **Health Monitoring**: Real-time database health checks and metrics
- **Pool Statistics**: Connection pool utilization and performance tracking
- **Performance Optimization**: Advanced indexing and query optimization
- **Index Monitoring**: Index usage statistics and optimization recommendations

## Database Migrations

The project includes a in-depth database migration system for managing PostgreSQL schema changes:

### Migration Commands
```bash
# Generate migration from entity changes
npm run migration:generate -- -n AddUserTable

# Create empty migration file
npm run migration:create -- -n AddUserTable

# Run pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### Migration API
- `GET /migrations` - List all migrations
- `GET /migrations/stats` - Get migration statistics
- `POST /migrations/run` - Execute pending migrations
- `POST /migrations/rollback` - Rollback last migration
- `POST /migrations/create` - Create new migration file

For detailed information, see [Database Migration Documentation](src/database/README.md).

## Development

### Code Quality
- ESLint configuration for code standards
- Prettier for code formatting
- Husky for git hooks
- Commitlint for conventional commits

### Testing
```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

### Docker Development
```bash
# Build and run all services
docker-compose up --build

# Run only database
docker-compose up postgres kafka

# View logs
docker-compose logs -f app
```

## Project Structure

```
src/
├── database/          # Database migration system
│   ├── migrations/    # Migration files
│   ├── migration.service.ts
│   ├── migration.controller.ts
│   ├── database.module.ts
│   ├── data-source.ts
│   └── README.md      # Migration documentation
├── modules/           # Feature modules
│   ├── accounts/      # Account management
│   ├── tokens/        # SPL token operations
│   ├── transactions/  # Transaction services
│   └── ...
├── common/            # Shared utilities
├── config/            # Configuration
└── main.ts           # Application entry point
```

## Contributing

1. Follow the [Master Iteration Plan](MASTER-ITERATION.md)
2. Adhere to design principles and code standards
3. Maintain test coverage above 80%
4. Update documentation as needed

## Learning Path

This project provides implementation reference and educational resource. Start with the [Study Guide](STUDY.md) to understand Solana concepts, then explore the codebase for practical implementations.

## Resources

- [Solana Official Documentation](https://docs.solana.com/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Program](https://spl.solana.com/token)

## License

MIT License - see [LICENSE](LICENSE) file for details.