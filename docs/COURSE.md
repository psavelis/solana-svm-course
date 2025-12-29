# Solana SVM Study Course

## Course Overview

**Course Title**: Mastering Solana and SVM Development: From EVM to Solana

**Duration**: 16 weeks (part-time) / 8 weeks (full-time)

**Level**: Intermediate to Advanced

**Prerequisites**: JavaScript/TypeScript, basic blockchain concepts, familiarity with EVM development

**Learning Objectives**:
- Master Solana blockchain architecture and SVM (Solana Virtual Machine)
- Build Solana applications using NestJS
- Understand key differences between EVM and SVM paradigms
- Implement blockchain solutions
- Deploy and monitor Solana applications in production

## Course Repository Structure

```
solana-svm-study/
├── docs/                          # Course documentation
│   ├── COURSE.md                 # This course curriculum
│   ├── STUDY.md                  # Detailed study topics
│   ├── TASKS.md                  # Implementation tasks
│   ├── MASTER-ITERATION.md       # Project philosophy
│   └── diagrams/                 # Architecture diagrams
│       ├── 01-accounts-programs.md
│       ├── 02-transactions-instructions.md
│       ├── 03-token-standards.md
│       ├── 04-account-abstraction.md
│       ├── 05-fee-mechanism.md
│       ├── 06-consensus-validation.md
│       ├── 07-signing-cryptography.md
│       ├── 08-mpc.md
│       ├── 09-svm.md
│       ├── 10-cpis.md
│       ├── 11-events-logging.md
│       ├── 12-security-practices.md
│       ├── 13-development-tools.md
│       ├── 14-network-architecture.md
│       ├── 15-advanced-features.md
│       └── README.md
├── src/                          # Application source code
│   ├── app.module.ts             # Main application module
│   ├── main.ts                   # Application entry point
│   ├── modules/                  # Feature modules
│   │   ├── accounts/            # Account management
│   │   │   ├── accounts.controller.ts
│   │   │   ├── accounts.service.ts
│   │   │   └── accounts.module.ts
│   │   ├── transactions/        # Transaction services
│   │   │   ├── transactions.controller.ts
│   │   │   ├── transactions.service.ts
│   │   │   └── transactions.module.ts
│   │   ├── tokens/              # SPL token operations
│   │   │   ├── tokens.controller.ts
│   │   │   ├── tokens.service.ts
│   │   │   └── tokens.module.ts
│   │   ├── signing/             # Cryptographic signing
│   │   ├── security/            # Security services
│   │   ├── smart-accounts/      # Account abstraction
│   │   ├── mpc/                 # Multi-party computation
│   │   ├── svm/                 # Virtual machine integration
│   │   ├── cpi/                 # Cross-program invocations
│   │   ├── events/              # Event streaming
│   │   ├── fee/                 # Fee management
│   │   └── __tests__/           # Module test suites
│   ├── common/                  # Shared utilities
│   │   ├── health/              # Health checks
│   │   │   ├── health.controller.ts
│   │   │   ├── health.module.ts
│   │   │   ├── database.health.ts
│   │   │   ├── kafka.health.ts
│   │   │   └── redis.health.ts
│   │   ├── kafka/               # Message queue
│   │   │   └── kafka.module.ts
│   │   └── redis/               # Caching
│   │       └── redis.module.ts
│   ├── database/                # Database layer
│   │   ├── data-source.ts       # TypeORM configuration
│   │   ├── database.module.ts   # Database module
│   │   ├── migrations/          # Database migrations
│   │   │   ├── 1735512000000-CreateAccountsTable.ts
│   │   │   ├── 1735512000001-CreateTransactionsTable.ts
│   │   │   └── ...
│   │   ├── database-connection.controller.ts
│   │   ├── database-performance.controller.ts
│   │   ├── migration.controller.ts
│   │   └── __tests__/           # Database tests
│   └── shared/                  # Shared types and interfaces
├── infra/                        # Infrastructure as code
│   ├── k8s/                     # Kubernetes manifests
│   │   ├── app.yaml
│   │   ├── configmap.yaml
│   │   ├── kafka.yaml
│   │   ├── namespace.yaml
│   │   ├── postgres.yaml
│   │   ├── pvc.yaml
│   │   ├── redis.yaml
│   │   ├── secret.yaml
│   │   ├── solana-validator.yaml
│   │   └── zookeeper.yaml
│   └── monitoring/              # Monitoring stack
│       ├── grafana.yaml
│       └── prometheus.yaml
├── scripts/                      # Utility scripts
│   └── validate-mermaid.js      # Diagram validation
├── test/                        # End-to-end tests
├── coverage/                    # Test coverage reports
├── docker-compose.yml           # Local development setup
├── Dockerfile                   # Container definition
├── nest-cli.json               # NestJS CLI config
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
└── README.md                   # Project overview
```

### Navigation Guide

1. **Start Here**: Read this COURSE.md for overview and setup
2. **Deep Dive**: [STUDY.md](./STUDY.md) for detailed concepts with EVM comparisons
3. **Implementation**: [TASKS.md](./TASKS.md) for specific development tasks
4. **Code Examples**: `src/modules/` for working implementations
5. **Architecture**: `docs/diagrams/` for visual learning
6. **Deployment**: `infra/` for production setup
7. **Philosophy**: [MASTER-ITERATION.md](./MASTER-ITERATION.md) for project approach

### 📚 **Week 1-2: Foundations & Setup**
**Topics**: Project setup, architecture, basic concepts
**Modules**: Infrastructure, Database, Health Checks
**Deliverables**: Local development environment, basic API endpoints
**Key Files**: `docker-compose.yml`, `src/database/`, `src/common/health/`

### 🔑 **Week 3-4: Core Solana Concepts**
**Topics**: Accounts, Programs, Transactions, Instructions
**Modules**: Accounts, Transactions
**Deliverables**: Account management API, transaction services
**Key Files**: `src/modules/accounts/`, `src/modules/transactions/`

### 💰 **Week 5-6: Token Economics**
**Topics**: SPL Tokens, Token Standards, Fee Mechanisms
**Modules**: Tokens, Fee Management
**Deliverables**: Token operations API, fee optimization services
**Key Files**: `src/modules/tokens/`, `src/modules/fee/`

### 🔐 **Week 7-8: Security & Signing**
**Topics**: Cryptography, Multi-sig, Account Abstraction
**Modules**: Signing, Security, Smart Accounts, MPC
**Deliverables**: Secure signing services, MPC wallet implementation
**Key Files**: `src/modules/signing/`, `src/modules/security/`, `src/modules/smart-accounts/`, `src/modules/mpc/`

### ⚡ **Week 9-10: SVM Deep Dive**
**Topics**: Virtual Machine, Program Execution, Gas Metering
**Modules**: SVM, Runtime Execution
**Deliverables**: Program deployment API, execution monitoring
**Key Files**: `src/modules/svm/`

### 🔗 **Week 11-12: Advanced Interactions**
**Topics**: Cross-Program Invocations, Events, Monitoring
**Modules**: CPI, Events
**Deliverables**: Event streaming system, CPI services
**Key Files**: `src/modules/cpi/`, `src/modules/events/`

### 🏗️ **Week 13-14: Production Architecture**
**Topics**: Infrastructure, Deployment, Monitoring
**Modules**: Infrastructure, Kubernetes, Monitoring
**Deliverables**: Production deployment, observability stack
**Key Files**: `infra/k8s/`, `infra/monitoring/`

### 🚀 **Week 15-16: Capstone Project**
**Topics**: Integration, Optimization, Best Practices
**Modules**: All modules integration
**Deliverables**: Complete DeFi application, course portfolio
**Key Files**: All modules, test suite

## Learning Methodology

### Active Learning Approach

This course follows an **active learning methodology** where theory is immediately applied to practical implementation:

1. **Concept Introduction**: Learn theoretical concepts with EVM comparisons
2. **Code Implementation**: Build working APIs and services
3. **Testing & Validation**: Write tests
4. **Integration**: Connect modules into cohesive systems
5. **Production Deployment**: Deploy to real infrastructure

### Best Practices Emphasized

#### Code Quality
- **SOLID Principles**: Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion
- **DRY (Don't Repeat Yourself)**: Eliminate code duplication
- **YAGNI (You Aren't Gonna Need It)**: Implement only necessary features
- **KISS (Keep It Simple, Stupid)**: Favor simplicity

#### Testing Strategy
- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test module interactions
- **API Tests**: Test endpoints and contracts
- **Coverage Goal**: Maintain >80% test coverage

#### Documentation Standards
- **Code Comments**: Reference official documentation
- **API Documentation**: OpenAPI/Swagger specifications
- **Architecture Diagrams**: Visual system representations
- **README Files**: Module and feature documentation

#### Security First
- **Input Validation**: Sanitize all inputs
- **Authentication**: Secure API access
- **Cryptography**: Use audited libraries
- **Audit Trail**: Log security events

### Weekly Learning Cycle

1. **Monday**: Theory review and planning
2. **Tuesday**: Implementation and coding
3. **Wednesday**: Testing and debugging
4. **Thursday**: Integration and optimization
5. **Friday**: Review, documentation, and submission
6. **Weekend**: Exploration and advanced topics

### Module 1: Infrastructure & Architecture (Week 1-2)

#### Learning Objectives
- Understand enterprise blockchain architecture
- Set up local Solana development environment
- Understand containerization and orchestration
- Implement health monitoring and observability

#### Topics Covered
1. **Project Architecture**
   - NestJS framework patterns with TypeORM
   - SOLID principles in blockchain development
   - Microservices design for blockchain apps
   - Swagger/OpenAPI documentation

2. **Database Design**
   - PostgreSQL with TypeORM and migrations
   - Connection pooling and performance optimization
   - Entity relationships and data modeling
   - Database health monitoring

3. **Message Queue Integration**
   - Apache Kafka for event streaming
   - Asynchronous processing patterns
   - Dead letter queues and error handling
   - Event-driven architecture

4. **Local Solana Environment**
   - Test validator setup and configuration
   - Faucet integration for development
   - Multi-network configuration (local/devnet/testnet/mainnet)
   - RPC endpoint management

#### Hands-on Exercises
- [ ] Set up complete development environment with Docker Compose
- [ ] Deploy local Solana validator and verify connectivity
- [ ] Implement database migrations and test connection pooling
- [ ] Configure Kafka messaging and test event publishing
- [ ] Build and test health check endpoints
- [ ] Explore Swagger API documentation at `/api`
- [ ] Configure environment variables for different networks

#### Resources
- 📖 [Infrastructure Guide](../infra/README.md)
- 📊 [Architecture Diagrams](../docs/diagrams/)
- 🔧 [Docker Compose Setup](../docker-compose.yml)
- 📚 [Database Documentation](../src/database/README.md)
- 🌐 [API Documentation](http://localhost:3000/api) (when running)

---

### Module 2: Accounts & Transactions (Week 3-4)

#### Learning Objectives
- Understand Solana account model and PDAs
- Understand transaction lifecycle and instructions
- Implement account management APIs
- Handle transaction submission and monitoring

#### Topics Covered
1. **Account Types & Lifecycle**
   - System accounts, program accounts, data accounts
   - Rent exemption mechanisms
   - Program Derived Addresses (PDAs)
   - Account creation and management

2. **Transaction Structure**
   - Instructions and transaction building
   - Serialization and signing workflows
   - Atomicity and transaction ordering
   - Error handling and retries

3. **RPC Integration**
   - Connection management and failover
   - Network switching (local/devnet/testnet/mainnet)
   - WebSocket connections for real-time updates
   - Rate limiting and request optimization

#### Hands-on Exercises
- [ ] Implement account CRUD operations (`POST /accounts`, `GET /accounts`, etc.)
- [ ] Build account balance queries from Solana RPC
- [ ] Create transaction submission endpoints
- [ ] Implement transaction status tracking
- [ ] Set up WebSocket connections for account changes
- [ ] Handle transaction confirmations and errors
- [ ] Test PDA generation and validation
- [ ] Implement retry mechanisms for failed transactions

#### API Endpoints to Implement
```
POST   /accounts                    # Create account record
GET    /accounts                    # List all accounts
GET    /accounts/:id                # Get account by ID
GET    /accounts/address/:address   # Get account by Solana address
PUT    /accounts/:id                # Update account
DELETE /accounts/:id                # Delete account

POST   /transactions                # Create transaction
GET    /transactions                # List transactions
GET    /transactions/:id            # Get transaction by ID
POST   /transactions/:id/submit     # Submit to blockchain
GET    /transactions/:id/status     # Check confirmation status
```

#### Resources
- 📖 [Accounts Module](../src/modules/accounts/)
- 📖 [Transactions Module](../src/modules/transactions/)
- 📊 [Accounts Diagram](../docs/diagrams/01-accounts-programs.md)
- 📊 [Transactions Diagram](../docs/diagrams/02-transactions-instructions.md)
- 🔧 [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

---

### Module 3: Token Standards & Economics (Week 5-6)

#### Learning Objectives
- Understand SPL token standards
- Implement token operations
- Understand fee markets
- Build token management systems

#### Topics Covered
1. **SPL Token Standards**
   - Token Program (SPL-Token)
   - Associated Token Accounts (ATAs)
   - Token metadata and extensions
   - NFT standards (SPL-Token-2022)

2. **Token Operations**
   - Minting, burning, transferring
   - Authority management
   - Token approvals and delegations

3. **Fee Mechanisms**
   - Base fees and priority fees
   - Compute unit limits
   - Fee optimization strategies

#### Hands-on Exercises
- [ ] Implement token creation endpoints (`POST /tokens`)
- [ ] Build token minting and burning operations
- [ ] Create Associated Token Account (ATA) management
- [ ] Implement token transfers between accounts
- [ ] Set up token metadata management
- [ ] Build NFT creation and management
- [ ] Implement fee estimation and optimization
- [ ] Create token analytics and reporting

#### API Endpoints to Implement
```
POST   /tokens                      # Create new token
GET    /tokens                      # List tokens
GET    /tokens/:id                  # Get token details
POST   /tokens/:id/mint             # Mint tokens
POST   /tokens/:id/burn             # Burn tokens
POST   /tokens/transfer             # Transfer tokens
GET    /tokens/:id/balance/:address # Check token balance

POST   /fee/estimate                # Estimate transaction fees
GET    /fee/prioritization          # Get fee prioritization
POST   /fee/optimize                # Optimize transaction fees
```

#### Resources
- 📖 [Tokens Module](../src/modules/tokens/)
- 📖 [Fee Module](../src/modules/fee/)
- 📊 [Token Standards Diagram](../docs/diagrams/03-token-standards.md)
- 📊 [Fee Mechanism Diagram](../docs/diagrams/05-fee-mechanism.md)
- 🔧 [SPL Token Documentation](https://spl.solana.com/token)

---

### Module 4: Security & Cryptography (Week 7-8)

#### Learning Objectives
- Understand cryptographic operations
- Implement secure signing workflows
- Understand account abstraction
- Build multi-party computation systems

#### Topics Covered
1. **Cryptographic Primitives**
   - Ed25519 keypairs and signatures
   - Key generation and management
   - Hardware wallet integration

2. **Account Abstraction**
   - Smart accounts via programs
   - Programmable authorization
   - Session keys and delegation

3. **Multi-Party Computation**
   - Threshold signatures
   - Distributed key generation
   - Secure MPC protocols

#### Hands-on Exercises
- [ ] Implement Ed25519 key generation and management
- [ ] Build transaction signing workflows
- [ ] Create JWT authentication system
- [ ] Implement API key management
- [ ] Set up role-based access control (RBAC)
- [ ] Build smart account system with session keys
- [ ] Implement MPC wallet creation
- [ ] Test threshold signature schemes

#### API Endpoints to Implement
```
POST   /auth/login                  # User authentication
POST   /auth/register               # User registration
GET    /auth/profile                # Get user profile
POST   /auth/refresh                # Refresh JWT token

POST   /signing/keys                # Generate keypair
POST   /signing/sign                # Sign transaction
POST   /signing/verify              # Verify signature

POST   /smart-accounts              # Create smart account
POST   /smart-accounts/:id/auth     # Authorize transaction
GET    /smart-accounts/:id/sessions # List active sessions

POST   /mpc/wallets                 # Create MPC wallet
POST   /mpc/sign                    # MPC transaction signing
GET    /mpc/wallets/:id             # Get MPC wallet details
```

#### Resources
- 📖 [Signing Module](../src/modules/signing/)
- 📖 [Security Module](../src/modules/security/)
- 📖 [Smart Accounts Module](../src/modules/smart-accounts/)
- 📖 [MPC Module](../src/modules/mpc/)
- 📊 [Signing Diagram](../docs/diagrams/07-signing-cryptography.md)
- 📊 [MPC Diagram](../docs/diagrams/08-mpc.md)

---

### Module 5: Solana Virtual Machine (Week 9-10)

#### Learning Objectives
- Understand SVM architecture
- Implement program execution
- Understand gas metering
- Build runtime monitoring systems

#### Topics Covered
1. **SVM Architecture**
   - Sealevel runtime
   - Parallel execution model
   - Compute budget management

2. **Program Management**
   - Deployment and lifecycle
   - Version control and upgrades
   - Program state tracking

3. **Runtime Execution**
   - Single and parallel execution
   - Gas metering and limits
   - Performance monitoring

#### Hands-on Exercises
- [ ] Deploy and manage Solana programs
- [ ] Implement program state tracking
- [ ] Build compute budget monitoring
- [ ] Create program upgrade workflows
- [ ] Develop SVM execution analytics
- [ ] Implement parallel execution patterns
- [ ] Build gas metering dashboards
- [ ] Test program deployment lifecycle

#### API Endpoints to Implement
```
POST   /svm/programs                # Deploy program
GET    /svm/programs/:id            # Get program info
PUT    /svm/programs/:id            # Upgrade program
DELETE /svm/programs/:id            # Close program

POST   /svm/execute                 # Execute program instruction
GET    /svm/logs/:programId         # Get execution logs
GET    /svm/metrics                 # Get SVM metrics

POST   /svm/accounts/:id            # Create program account
GET    /svm/accounts/:id            # Get account state
PUT    /svm/accounts/:id            # Update account state
```

#### Resources
- 📖 [SVM Module](../src/modules/svm/)
- 📊 [SVM Diagram](../docs/diagrams/09-svm.md)
- 🔧 [Solana CLI Documentation](https://docs.solana.com/cli)
- 📚 [Sealevel Runtime](https://docs.solana.com/developing/runtime-facilities)

---

### Module 6: Advanced Interactions (Week 11-12)

#### Learning Objectives
- Understand cross-program communication
- Implement event streaming
- Build monitoring systems
- Understand program composition

#### Topics Covered
1. **Cross-Program Invocations**
   - CPI mechanics and security
   - Program composition patterns
   - Permission and access control

2. **Event Systems**
   - Event emission and parsing
   - Real-time streaming
   - Historical data indexing

3. **Monitoring & Observability**
   - Blockchain event monitoring
   - Performance metrics
   - Alerting and logging

#### Hands-on Exercises
- [ ] Implement cross-program invocation services
- [ ] Build event emission and parsing system
- [ ] Create real-time event streaming with Kafka
- [ ] Develop CPI security and permission controls
- [ ] Build event indexing and historical data APIs
- [ ] Implement program composition patterns
- [ ] Create monitoring dashboards for CPI performance
- [ ] Set up event-driven alerting systems

#### API Endpoints to Implement
```
POST   /cpi/invoke                  # Execute CPI
GET    /cpi/programs                # List available programs
GET    /cpi/programs/:id            # Get program metadata

POST   /events/emit                 # Emit custom event
GET    /events/stream               # Stream events (SSE/WebSocket)
GET    /events/history              # Query historical events
GET    /events/:id                  # Get specific event

POST   /events/subscriptions         # Create event subscription
GET    /events/subscriptions         # List subscriptions
DELETE /events/subscriptions/:id     # Remove subscription

GET    /monitoring/cpi              # CPI performance metrics
GET    /monitoring/events           # Event processing metrics
```

#### Resources
- 📖 [CPI Module](../src/modules/cpi/)
- 📖 [Events Module](../src/modules/events/)
- 📊 [CPI Diagram](../docs/diagrams/10-cpis.md)
- 📊 [Events Diagram](../docs/diagrams/11-events-logging.md)
- 🔧 [Kafka Integration](../src/common/kafka/)

---

### Module 7: Production Deployment (Week 13-14)

#### Learning Objectives
- Understand Kubernetes orchestration
- Implement production monitoring
- Understand scaling patterns
- Deploy enterprise blockchain solutions

#### Topics Covered
1. **Container Orchestration**
   - Kubernetes manifests
   - Service discovery
   - Resource management

2. **Monitoring Stack**
   - Prometheus metrics
   - Grafana dashboards
   - Alert management

3. **Production Architecture**
   - Multi-environment setup
   - Security hardening
   - Performance optimization

#### Hands-on Exercises
- [ ] Deploy complete application stack to Kubernetes
- [ ] Configure Prometheus metrics collection
- [ ] Build Grafana dashboards for blockchain metrics
- [ ] Set up multi-environment deployments (dev/staging/prod)
- [ ] Implement horizontal pod autoscaling
- [ ] Configure network policies and security contexts
- [ ] Set up CI/CD pipeline with automated deployments
- [ ] Implement backup and disaster recovery procedures
- [ ] Configure log aggregation and centralized logging
- [ ] Set up alerting rules for critical system events

#### Infrastructure Components to Deploy
```
Kubernetes Resources:
├── Namespace: solana-svm-study
├── ConfigMaps: app-config, network-config
├── Secrets: database-credentials, api-keys
├── Deployments: app, solana-validator, kafka, redis
├── Services: app-service, database-service, kafka-service
├── Ingress: api-gateway, monitoring-gateway
├── PersistentVolumeClaims: database-storage, logs-storage
└── NetworkPolicies: app-isolation, monitoring-access

Monitoring Stack:
├── Prometheus: metrics collection and alerting
├── Grafana: visualization dashboards
├── AlertManager: alert routing and notifications
└── Node Exporter: system metrics
```

#### Resources
- 📖 [Infrastructure Guide](../infra/README.md)
- 📖 [Kubernetes Manifests](../infra/k8s/)
- 📖 [Monitoring Setup](../infra/monitoring/)
- 🔧 [Docker Compose](../docker-compose.yml)
- 📚 [K8s Best Practices](https://kubernetes.io/docs/concepts/)

---

### Module 8: Capstone Project (Week 15-16)

#### Project Overview
Build a Solana SVM management platform that provides APIs for account management, transaction processing, token operations, and security services. The platform will serve as a backend for DeFi applications, wallets, and blockchain analytics tools.

#### Project Requirements
- **Core Features**:
  - Complete account lifecycle management (creation, PDAs, smart accounts)
  - Transaction building, signing, and broadcasting with fee optimization
  - SPL token operations (mint, transfer, burn, freeze)
  - Multi-signature wallet support with MPC capabilities
  - Real-time event streaming and historical data indexing
  - Cross-program invocation services for DeFi composability
  - SVM program deployment and management
  - Security with JWT auth and RBAC

- **Technical Requirements**:
  - Kubernetes deployment with auto-scaling
  - Full monitoring stack (Prometheus + Grafana + alerting)
  - >80% test coverage with integration tests
  - API documentation with OpenAPI/Swagger
  - Database migrations and connection pooling
  - Event-driven architecture with Kafka messaging
  - Multi-network support (local/devnet/testnet/mainnet)

- **Architecture Requirements**:
  - NestJS microservices with modular design
  - TypeORM with PostgreSQL for data persistence
  - Redis caching for performance optimization
  - Apache Kafka for event streaming and async processing
  - Docker containerization with multi-stage builds
  - Health checks and graceful shutdown handling

#### Deliverables Checklist
- [ ] NestJS application with all 11 modules implemented
- [ ] REST API with 50+ endpoints
- [ ] Full Kubernetes deployment with production manifests
- [ ] Monitoring stack with custom Grafana dashboards
- [ ] Automated test suites (unit, integration, e2e)
- [ ] Database schema with migrations and seeders
- [ ] Docker Compose for local development
- [ ] API documentation and Postman collection
- [ ] Performance benchmarks and load testing results
- [ ] Security audit checklist and implementation
- [ ] Project documentation and deployment guide

#### Evaluation Criteria
- **Functionality (40%)**: All API endpoints working, feature completeness
- **Architecture (25%)**: Clean code, SOLID principles, scalable design
- **Testing (15%)**: Test coverage, test quality, CI/CD integration
- **Production Readiness (10%)**: Deployment automation, monitoring, security
- **Documentation (10%)**: API docs, code comments, deployment guides

#### Capstone Project Milestones
1. **Week 15**: Core modules implementation (accounts, transactions, tokens)
2. **Week 15**: Security and authentication system
3. **Week 16**: Advanced features (MPC, SVM, CPI, events)
4. **Week 16**: Production deployment and monitoring
5. **Week 16**: Final testing, documentation, and presentation

#### Resources
- 📖 [All Module Implementations](../src/modules/)
- 🏗️ [Production Infrastructure](../infra/)
- 📊 [System Architecture Diagrams](../docs/diagrams/)
- 🔧 [Development Tools](../package.json)
- 📚 [Database Schema](../src/database/)
- 🧪 [Test Suites](../src/**/__tests__/)

## Getting Started

### Prerequisites
- **Technical Skills**:
  - JavaScript/TypeScript proficiency
  - Basic blockchain concepts
  - REST API development
  - Docker and containerization

- **Development Environment**:
  - Node.js 18+ (check with `node --version`)
  - Docker & Docker Compose (check with `docker --version`)
  - Git (check with `git --version`)
  - VS Code (recommended) with extensions:
    - TypeScript and JavaScript Language Features
    - NestJS files
    - Prettier - Code formatter
    - ESLint

- **Blockchain Knowledge**:
  - Understanding of EVM concepts (accounts, transactions, gas)
  - Basic cryptography (public/private keys, signatures)
  - Smart contract development experience (Solidity preferred)

### Complete Setup Instructions

#### 1. Clone and Install Dependencies
```bash
# Clone the repository
git clone https://github.com/psavelis/solana-svm-study.git
cd solana-svm-study

# Install all dependencies
npm install

# Verify installation
npm --version
node --version
```

#### 2. Start Infrastructure Stack
```bash
# Start all services (PostgreSQL, Kafka, Redis, Solana validator)
docker-compose up -d

# Wait for services to be healthy (may take 2-3 minutes)
docker-compose ps

# Check Solana validator logs
docker-compose logs solana-validator

# Verify Solana validator is running
curl http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env  # (if exists, otherwise create .env)

# Edit .env with your configuration
# Key settings:
SOLANA_RPC_URL=http://localhost:8899
DATABASE_URL=postgresql://user:password@localhost:5432/solana_svm
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-here
```

#### 4. Database Setup
```bash
# Run database migrations
npm run migration:run

# Verify migrations
npm run migration:show

# (Optional) Generate new migration after schema changes
npm run migration:generate -- -n CreateNewTable
```

#### 5. Start Development Server
```bash
# Start in development mode with hot reload
npm run start:dev

# Server will be available at:
# - API: http://localhost:3000
# - Swagger Documentation: http://localhost:3000/api
# - Health Checks: http://localhost:3000/health
```

#### 6. Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage report
npm run test:cov

# Run end-to-end tests
npm run test:e2e

# View coverage report in browser
open coverage/lcov-report/index.html
```

#### 7. Code Quality Checks
```bash
# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build

# Validate Mermaid diagrams
npm run docs:mermaid:validate
```

### Development Workflow

#### Daily Development Cycle
```bash
# 1. Pull latest changes
git pull origin main

# 2. Start development environment
docker-compose up -d
npm run start:dev

# 3. Make changes and test
npm test

# 4. Format and lint
npm run format && npm run lint

# 5. Commit changes
git add .
git commit -m "feat: implement new feature"
git push origin feature-branch
```

#### Testing API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# API documentation
open http://localhost:3000/api

# Example API calls:
# Get accounts
curl http://localhost:3000/accounts

# Get transactions
curl http://localhost:3000/transactions

# Get tokens
curl http://localhost:3000/tokens
```

#### Debugging
```bash
# Start in debug mode
npm run start:debug

# Run tests in debug mode
npm run test:debug

# Check logs
docker-compose logs -f app

# Database debugging
docker-compose exec postgres psql -U user -d solana_svm
```

### Troubleshooting

#### Common Issues

**Port conflicts:**
```bash
# Check what's using ports
lsof -i :3000
lsof -i :5432
lsof -i :9092

# Stop conflicting services or change ports in docker-compose.yml
```

**Database connection issues:**
```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres

# Re-run migrations
npm run migration:run
```

**Solana validator issues:**
```bash
# Restart validator
docker-compose restart solana-validator

# Check validator status
curl http://localhost:8899 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"getSlot"}'
```

**Memory issues:**
```bash
# Increase Docker memory limit
# Docker Desktop: Preferences > Resources > Memory
# Or add to docker-compose.yml:
# services:
#   app:
#     deploy:
#       resources:
#         limits:
#           memory: 2G
```

### Environment Variations

#### Local Development (Default)
- Uses local PostgreSQL, Kafka, Redis
- Local Solana test validator
- Hot reload enabled
- All services in docker-compose.yml

#### Production Setup
```bash
# Use production environment
cp .env.production .env

# Deploy to Kubernetes
kubectl apply -f infra/k8s/

# Or use Docker Compose for staging
docker-compose -f docker-compose.prod.yml up -d
```

#### Testing Environment
```bash
# Use test-specific settings
cp .env.test .env

# Run tests
npm run test:e2e
```

### Next Steps After Setup

1. **Explore the API**: Visit http://localhost:3000/api
2. **Read Study Topics**: Check [STUDY.md](./STUDY.md)
3. **Review Tasks**: See [TASKS.md](./TASKS.md)
4. **Start Module 1**: Begin with infrastructure and database setup
5. **Join Community**: Connect with other learners for support
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run Application**:
```bash
npm run start:dev
```

5. **Verify Setup**:
```bash
curl http://localhost:3000/health
```

### Development Workflow

1. **Weekly Structure**:
   - Monday: Theory and reading
   - Tuesday-Thursday: Implementation
   - Friday: Testing and review
   - Weekend: Integration and optimization

2. **Code Standards**:
   - Follow SOLID principles
   - Maintain >80% test coverage
   - Use TypeScript strictly
   - Document all APIs

3. **Git Workflow**:
   - Feature branches for development
   - Regular commits with descriptive messages
   - Pull requests for code review
   - Main branch always deployable

## Assessment & Certification

## Assessment & Certification

### Weekly Module Completion Checklist

#### ✅ **Module 1: Infrastructure & Architecture**
- [ ] Docker Compose environment running (PostgreSQL, Kafka, Redis, Solana validator)
- [ ] Database migrations executed successfully
- [ ] Health check endpoints responding (`/health`)
- [ ] API documentation accessible (`/api`)
- [ ] Basic project structure understood
- [ ] Development workflow established

**Verification Commands:**
```bash
# Check all services
docker-compose ps

# Test health endpoint
curl http://localhost:3000/health

# Verify database connection
npm run migration:show

# Check API docs
curl http://localhost:3000/api
```

#### ✅ **Module 2: Accounts & Transactions**
- [ ] Account CRUD operations implemented (`GET/POST/PUT/DELETE /accounts`)
- [ ] Transaction lifecycle management (`POST /transactions`)
- [ ] Account balance queries working
- [ ] Transaction status tracking
- [ ] Basic Solana RPC integration
- [ ] Event publishing to Kafka

**API Endpoints to Test:**
```bash
# Create account
curl -X POST http://localhost:3000/accounts \
  -H "Content-Type: application/json" \
  -d '{"publicKey":"test-key","accountType":"user"}'

# Get accounts
curl http://localhost:3000/accounts

# Create transaction
curl -X POST http://localhost:3000/transactions \
  -H "Content-Type: application/json" \
  -d '{"fromAccount":"key1","toAccount":"key2","amount":100}'
```

#### ✅ **Module 3: Token Standards & Economics**
- [ ] SPL token creation endpoints (`POST /tokens`)
- [ ] Token minting and burning (`POST /tokens/mint`, `POST /tokens/burn`)
- [ ] Token transfers (`POST /tokens/transfer`)
- [ ] Token balance queries (`GET /tokens/balance/:address`)
- [ ] Associated token account management
- [ ] Fee calculation and optimization

**Token Operations:**
```bash
# Create token
curl -X POST http://localhost:3000/tokens \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Token","symbol":"TEST","decimals":9}'

# Mint tokens
curl -X POST http://localhost:3000/tokens/mint \
  -H "Content-Type: application/json" \
  -d '{"tokenAddress":"token-addr","amount":1000000000}'

# Check balance
curl http://localhost:3000/tokens/balance/wallet-address
```

#### ✅ **Module 4: Security & Cryptography**
- [ ] JWT authentication system (`POST /auth/login`)
- [ ] Keypair generation (`POST /signing/keys`)
- [ ] Transaction signing (`POST /signing/sign`)
- [ ] Smart account creation (`POST /smart-accounts`)
- [ ] MPC wallet setup (`POST /mpc/wallets`)
- [ ] Session key management

**Security Testing:**
```bash
# Generate keys
curl -X POST http://localhost:3000/signing/keys

# Create smart account
curl -X POST http://localhost:3000/smart-accounts \
  -H "Content-Type: application/json" \
  -d '{"owner":"owner-key","threshold":2}'

# Authenticate
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

#### ✅ **Module 5: SVM Deep Dive**
- [ ] Program deployment (`POST /svm/programs`)
- [ ] Program execution (`POST /svm/execute`)
- [ ] State tracking (`GET /svm/accounts/:id`)
- [ ] Gas metering (`GET /svm/metrics`)
- [ ] Execution logs (`GET /svm/logs/:programId`)

#### ✅ **Module 6: Advanced Interactions**
- [ ] CPI invocation (`POST /cpi/invoke`)
- [ ] Event streaming (`GET /events/stream`)
- [ ] Event subscriptions (`POST /events/subscriptions`)
- [ ] Real-time monitoring (`GET /monitoring/*`)

#### ✅ **Module 7: Production Deployment**
- [ ] Kubernetes manifests applied
- [ ] Prometheus metrics configured
- [ ] Grafana dashboards created
- [ ] Production environment tested
- [ ] CI/CD pipeline functional

#### ✅ **Module 8: Capstone Project**
- [ ] All modules integrated
- [ ] End-to-end workflows tested
- [ ] Performance benchmarks completed
- [ ] Security audit passed
- [ ] Documentation complete

### Testing Requirements

#### Unit Test Coverage
- [ ] >80% overall coverage
- [ ] All controllers tested
- [ ] All services tested
- [ ] Error handling covered
- [ ] Edge cases addressed

**Coverage Check:**
```bash
npm run test:cov
# View report at coverage/lcov-report/index.html
```

#### Integration Tests
- [ ] Database operations
- [ ] Kafka messaging
- [ ] Solana RPC calls
- [ ] API endpoint integration
- [ ] Cross-module communication

**Run Integration Tests:**
```bash
npm run test:e2e
```

#### Performance Benchmarks
- [ ] API response times <200ms
- [ ] Database query optimization
- [ ] Concurrent user handling
- [ ] Memory usage monitoring

### Code Quality Standards

#### Automated Checks
```bash
# Format code
npm run format

# Lint code
npm run lint

# Build successfully
npm run build

# All tests pass
npm test
```

#### Manual Review Criteria
- [ ] SOLID principles followed
- [ ] DRY principle maintained
- [ ] Proper error handling
- [ ] Security best practices
- [ ] Documentation complete
- [ ] TypeScript types correct

### Final Project Submission

#### Deliverables Checklist
- [ ] Source code with all modules
- [ ] Test suite (>80% coverage)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema and migrations
- [ ] Infrastructure as code (K8s/Docker)
- [ ] Monitoring and alerting setup
- [ ] Performance benchmarks
- [ ] Security assessment
- [ ] Deployment guide
- [ ] Project presentation/demo

#### Evaluation Rubric

| Category | Weight | Criteria |
|----------|--------|----------|
| **Functionality** | 40% | All endpoints working, features complete |
| **Architecture** | 25% | Clean design, SOLID principles, scalability |
| **Testing** | 15% | Coverage, quality, integration tests |
| **Production Ready** | 10% | Deployment, monitoring, security |
| **Documentation** | 10% | API docs, code comments, guides |

#### Scoring Guide
- **90-100%**: Excellent - Well-built solutions
- **80-89%**: Excellent - Solid implementation, minor improvements needed
- **70-79%**: Good - Functional, requires optimization
- **60-69%**: Satisfactory - Basic functionality, significant gaps
- **<60%**: Needs improvement - Major rework required

### Certification Requirements

#### Completion Criteria
- [ ] All weekly modules completed
- [ ] Capstone project submitted and approved
- [ ] Code review passed
- [ ] Final presentation delivered
- [ ] Peer assessment completed

#### Certificate Issuance
Upon successful completion, participants receive:
- **Digital Certificate**: Blockchain-verifiable credential
- **Skills Assessment**: Detailed competency evaluation
- **Portfolio Addition**: Showcase project for employers
- **Professional Network**: Access to Solana developer community
- **Career Support**: Resume review and job placement assistance

## Resources & References

### 📚 **Course Documentation**
- **[STUDY.md](./STUDY.md)**: Detailed study topics with EVM comparisons
- **[TASKS.md](./TASKS.md)**: Implementation tasks with complexity assessment
- **[MASTER-ITERATION.md](./MASTER-ITERATION.md)**: Project philosophy and approach
- **[Diagrams README](./diagrams/README.md)**: Visual architecture documentation

### 📊 **Architecture Diagrams**
- **[01-accounts-programs.md](./diagrams/01-accounts-programs.md)**: Accounts vs Programs
- **[02-transactions-instructions.md](./diagrams/02-transactions-instructions.md)**: Transactions & Instructions
- **[03-token-standards.md](./diagrams/03-token-standards.md)**: SPL Token Standards
- **[04-account-abstraction.md](./diagrams/04-account-abstraction.md)**: Account Abstraction
- **[05-fee-mechanism.md](./diagrams/05-fee-mechanism.md)**: Fee Mechanisms
- **[06-consensus-validation.md](./diagrams/06-consensus-validation.md)**: Consensus & Validation
- **[07-signing-cryptography.md](./diagrams/07-signing-cryptography.md)**: Signing & Cryptography
- **[08-mpc.md](./diagrams/08-mpc.md)**: Multi-Party Computation
- **[09-svm.md](./diagrams/09-svm.md)**: Solana Virtual Machine
- **[10-cpis.md](./diagrams/10-cpis.md)**: Cross-Program Invocations
- **[11-events-logging.md](./diagrams/11-events-logging.md)**: Events & Logging
- **[12-security-practices.md](./diagrams/12-security-practices.md)**: Security Practices
- **[13-development-tools.md](./diagrams/13-development-tools.md)**: Development Tools
- **[14-network-architecture.md](./diagrams/14-network-architecture.md)**: Network Architecture
- **[15-advanced-features.md](./diagrams/15-advanced-features.md)**: Advanced Features

### 🏗️ **Infrastructure & Deployment**
- **[Infrastructure Guide](../infra/README.md)**: Infrastructure setup
- **[Kubernetes Manifests](../infra/k8s/)**: Production deployment configs
- **[Monitoring Stack](../infra/monitoring/)**: Observability setup
- **[Docker Compose](../docker-compose.yml)**: Local development environment
- **[Dockerfile](../Dockerfile)**: Container definition

### 💻 **Codebase References**
- **[Main Application](../src/main.ts)**: Application entry point
- **[App Module](../src/app.module.ts)**: Module configuration
- **[Database Layer](../src/database/)**: TypeORM setup and migrations
- **[Health Checks](../src/common/health/)**: System monitoring
- **[All Modules](../src/modules/)**: Feature implementations
- **[Test Suites](../src/**/__tests__/)**: Testing

### 📖 **API Documentation**
- **Swagger UI**: http://localhost:3000/api (when running)
- **[Health Endpoints](../src/common/health/health.controller.ts)**: System health checks
- **[Database Endpoints](../src/database/)**: Migration and connection APIs
- **[Module Controllers](../src/modules/**/controller.ts)**: Feature APIs

### 🔧 **Development Tools**
- **[Package.json](../package.json)**: Dependencies and scripts
- **[TypeScript Config](../tsconfig.json)**: TypeScript configuration
- **[NestJS Config](../nest-cli.json)**: NestJS CLI configuration
- **[Scripts](../scripts/)**: Utility scripts
- **[Coverage Reports](../coverage/)**: Test coverage analysis

### 🌐 **Official Documentation**
- [Solana Documentation](https://docs.solana.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token Documentation](https://spl.solana.com/token)
- [NestJS Documentation](https://docs.nestjs.com/)
- [TypeORM Documentation](https://typeorm.io/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### 🧪 **Testing & Quality**
- **[Jest Configuration](../package.json)**: Test framework setup
- **[Test Coverage](../coverage/lcov-report/index.html)**: Coverage reports
- **[Linting](../.eslintrc.js)**: Code quality rules
- **[Prettier](../.prettierrc)**: Code formatting

### 📋 **Project Management**
- **[GitHub Issues](https://github.com/psavelis/solana-svm-study/issues)**: Bug reports and features
- **[Pull Requests](https://github.com/psavelis/solana-svm-study/pulls)**: Code contributions
- **[Discussions](https://github.com/psavelis/solana-svm-study/discussions)**: Community discussions

### 🤝 **Community Resources**
- [Solana Stack Exchange](https://solana.stackexchange.com/)
- [Solana Discord](https://discord.com/invite/solana)
- [Solana Forum](https://forums.solana.com/)
- [Solana Developer Newsletter](https://www.solana.com/newsletter)

### 🛠️ **Tools & Frameworks**
- [Anchor Framework](https://www.anchor-lang.com/)
- [Metaplex SDK](https://docs.metaplex.com/)
- [Phantom Wallet](https://phantom.app/)
- [Solflare Wallet](https://solflare.com/)
- [Solana Explorer](https://explorer.solana.com/)
- [Solana CLI](https://docs.solana.com/cli)

### 📈 **Monitoring & Analytics**
- [Prometheus](https://prometheus.io/docs/)
- [Grafana](https://grafana.com/docs/)
- [Kibana](https://www.elastic.co/kibana) (ELK Stack)
- [DataDog](https://docs.datadoghq.com/) (Enterprise monitoring)

### 🔒 **Security Resources**
- [OWASP Blockchain](https://owasp.org/www-project-blockchain/)
- [Solana Security Guidelines](https://docs.solana.com/security/)
- [Cryptographic Best Practices](https://cryptography.io/)
- [Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)

## Support & Community

### Getting Help
1. **Documentation First**: Check course materials and official docs
2. **GitHub Issues**: Report bugs and request features
3. **Discussion Forums**: Engage with fellow learners
4. **Office Hours**: Weekly Q&A sessions (virtual)

### Contributing
- Fork the repository
- Create feature branches
- Submit pull requests
- Participate in code reviews

### Code of Conduct
- Respectful communication
- Collaborative learning
- Academic integrity
- Open source contribution

---

## Course Completion & Next Steps

### What You've Built
By completing this course, you will have developed a Solana SVM platform that includes:

- **Enterprise-Grade APIs**: 50+ REST endpoints for blockchain operations
- **Production Infrastructure**: Kubernetes deployment with monitoring
- **Security Implementation**: Authentication, authorization, and MPC
- **Event-Driven Architecture**: Kafka messaging and real-time processing
- **Database Design**: PostgreSQL with migrations and performance optimization
- **Testing Suite**: Unit and integration tests
- **Documentation**: API docs and deployment guides

### Career Opportunities
- **Blockchain Developer**: Build DeFi protocols and dApps
- **Backend Engineer**: Enterprise blockchain integration
- **DevOps Engineer**: Blockchain infrastructure and deployment
- **Security Engineer**: Cryptographic systems and smart contracts
- **Solutions Architect**: Enterprise blockchain solutions

### Advanced Learning Paths
1. **Smart Contract Development**: Learn Anchor framework for Solana programs
2. **DeFi Protocol Engineering**: Build AMMs, lending protocols, derivatives
3. **Layer 2 Solutions**: State channels, rollups, and scaling solutions
4. **Cross-Chain Bridges**: Multi-chain interoperability
5. **Blockchain Security**: Audit methodologies and secure development

### Professional Development
- **Certifications**: Obtain relevant blockchain certifications
- **Open Source**: Contribute to Solana ecosystem projects
- **Networking**: Join blockchain communities and conferences
- **Continuous Learning**: Stay updated with Solana ecosystem developments

### Final Assessment
Complete the capstone project and schedule a final review session to:
- [ ] Demonstrate your complete platform
- [ ] Discuss architecture decisions
- [ ] Review code quality and best practices
- [ ] Receive feedback and improvement suggestions
- [ ] Get certified completion and recommendations

---

*This course is maintained by the Solana developer community. Contributions and improvements are welcome!* 🚀

---

## Course Completion Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal**: Establish development environment and core concepts
- [ ] Complete Module 1: Infrastructure setup
- [ ] Docker Compose running with all services
- [ ] Database migrations executed
- [ ] Health endpoints responding
- [ ] API documentation accessible
- [ ] Basic CRUD operations working

**Milestone**: Local development environment fully operational

### Phase 2: Core Implementation (Weeks 3-6)
**Goal**: Build fundamental Solana operations
- [ ] Complete Modules 2-3: Accounts, Transactions, Tokens
- [ ] Account management APIs functional
- [ ] Transaction lifecycle implemented
- [ ] SPL token operations working
- [ ] Basic fee optimization
- [ ] Unit tests passing (>60% coverage)

**Milestone**: Core blockchain operations functional

### Phase 3: Advanced Features (Weeks 7-10)
**Goal**: Implement security and SVM features
- [ ] Complete Modules 4-5: Security, Signing, SVM
- [ ] JWT authentication system
- [ ] Cryptographic operations
- [ ] Smart account functionality
- [ ] MPC wallet operations
- [ ] Program deployment APIs
- [ ] Integration tests passing

**Milestone**: Built for business security and SVM integration

### Phase 4: Production & Integration (Weeks 11-16)
**Goal**: Production deployment and full integration
- [ ] Complete Modules 6-8: CPI, Events, Production
- [ ] Cross-program invocations
- [ ] Event streaming system
- [ ] Kubernetes deployment
- [ ] Monitoring stack configured
- [ ] Performance optimization
- [ ] End-to-end testing
- [ ] Documentation complete

**Milestone**: Stable and reliable application deployed

### Phase 5: Capstone & Certification
**Goal**: Complete project and get certified
- [ ] Capstone project completed
- [ ] All modules integrated
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Final presentation delivered
- [ ] Peer review completed

**Milestone**: Certified Solana developer

---

## Codebase Deep Dive: Understanding the Implementation

### Application Architecture Overview

```
src/
├── main.ts                    # Application bootstrap with Swagger
├── app.module.ts             # Root module importing all features
├── modules/                  # Feature modules (11 total)
│   ├── accounts/            # Account management (CRUD, PDAs, balances)
│   ├── transactions/        # Transaction lifecycle (create, sign, submit, monitor)
│   ├── tokens/              # SPL token operations (create, mint, transfer, burn)
│   ├── signing/             # Cryptographic signing (keys, signatures, verification)
│   ├── security/            # Authentication & authorization (JWT, RBAC)
│   ├── smart-accounts/      # Account abstraction (sessions, authorization)
│   ├── mpc/                 # Multi-party computation (threshold crypto)
│   ├── svm/                 # Virtual machine (program deployment, execution)
│   ├── cpi/                 # Cross-program invocations (program interactions)
│   ├── events/              # Event streaming (Kafka, WebSocket, webhooks)
│   └── fee/                 # Fee management (optimization, estimation)
├── common/                   # Shared utilities
│   ├── health/              # Health checks (database, Kafka, Redis, Solana)
│   ├── kafka/               # Message queue configuration
│   └── redis/               # Caching layer
├── database/                # Data persistence layer
│   ├── data-source.ts       # TypeORM configuration
│   ├── migrations/          # Database schema migrations
│   ├── entities/            # Database models (auto-generated)
│   └── repositories/        # Data access layer
└── shared/                  # Common types and interfaces
    ├── dto/                 # Data transfer objects
    ├── entities/            # Domain entities
    ├── interfaces/          # TypeScript interfaces
    └── types/               # Custom types
```

### Key Implementation Patterns

#### 1. Module Structure Pattern
Each module follows the same structure:
```
modules/{module-name}/
├── {module-name}.controller.ts    # REST API endpoints
├── {module-name}.service.ts       # Business logic
├── {module-name}.module.ts        # NestJS module configuration
├── dto/                          # Request/Response DTOs
├── entities/                     # Database entities
└── __tests__/                    # Unit and integration tests
```

#### 2. Controller Implementation Pattern
```typescript
@Controller('{module}')
export class {Module}Controller {
  constructor(private readonly {module}Service: {Module}Service) {}

  @Post()
  async create(@Body() createDto: Create{Module}Dto) {
    return this.{module}Service.create(createDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.{module}Service.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: Update{Module}Dto) {
    return this.{module}Service.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.{module}Service.remove(id);
  }
}
```

#### 3. Service Implementation Pattern
```typescript
@Injectable()
export class {Module}Service {
  constructor(
    @InjectRepository({Module}Entity)
    private readonly repository: Repository<{Module}Entity>,
    private readonly messagePublisher: MessagePublisherService,
  ) {}

  async create(createDto: Create{Module}Dto): Promise<{Module}Entity> {
    const entity = this.repository.create(createDto);
    const saved = await this.repository.save(entity);

    // Publish event
    await this.messagePublisher.publish('{module}.created', {
      id: saved.id,
      data: saved,
      timestamp: new Date(),
    });

    return saved;
  }
}
```

#### 4. Database Entity Pattern
```typescript
@Entity('{modules}')
export class {Module}Entity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}
```

### Database Schema Overview

The application uses 15+ database tables across all modules:

```sql
-- Core entities
accounts              -- Account information and metadata
transactions          -- Transaction records and status
tokens                -- SPL token definitions
token_accounts        -- Token holdings and balances

-- Security entities
users                 -- User accounts for authentication
user_sessions         -- Session management
api_keys              -- API key management

-- SVM entities
programs              -- Deployed Solana programs
program_accounts      -- Program state accounts
executions            -- Program execution records

-- Event entities
events                -- Event logs and history
subscriptions         -- Event subscriptions
webhooks              -- Webhook configurations

-- MPC entities
mpc_wallets           -- Multi-party wallets
mpc_signatures        -- Signature shares
mpc_sessions          -- MPC sessions

-- Smart account entities
smart_accounts        -- Smart account configurations
authorizations        -- Transaction authorizations
sessions              -- Active sessions
```

### API Endpoint Reference

The application exposes 50+ REST endpoints:

#### Health & System
```
GET    /health              # System health check
GET    /health/database     # Database health
GET    /health/kafka        # Kafka health
GET    /health/redis        # Redis health
GET    /health/solana       # Solana RPC health
```

#### Database Management
```
GET    /migrations           # List migrations
POST   /migrations/run       # Run pending migrations
POST   /migrations/revert    # Revert last migration
GET    /database/stats       # Database performance stats
GET    /database/connections # Connection pool status
```

#### Accounts (12 endpoints)
```
GET    /accounts             # List accounts
POST   /accounts             # Create account
GET    /accounts/:id         # Get account details
PUT    /accounts/:id         # Update account
DELETE /accounts/:id         # Delete account
GET    /accounts/:id/balance # Get account balance
POST   /accounts/pda         # Create PDA
GET    /accounts/pda/:seed   # Get PDA info
```

#### Transactions (10 endpoints)
```
GET    /transactions         # List transactions
POST   /transactions         # Create transaction
GET    /transactions/:id     # Get transaction details
PUT    /transactions/:id     # Update transaction
DELETE /transactions/:id     # Cancel transaction
POST   /transactions/:id/sign # Sign transaction
POST   /transactions/:id/submit # Submit to network
GET    /transactions/:id/status # Get status
POST   /transactions/batch   # Batch transactions
```

#### Tokens (15 endpoints)
```
GET    /tokens               # List tokens
POST   /tokens               # Create token
GET    /tokens/:id           # Get token details
PUT    /tokens/:id           # Update token
DELETE /tokens/:id           # Delete token
POST   /tokens/mint          # Mint tokens
POST   /tokens/burn          # Burn tokens
POST   /tokens/transfer      # Transfer tokens
GET    /tokens/balance/:address # Get balance
POST   /tokens/freeze        # Freeze account
POST   /tokens/thaw          # Thaw account
GET    /tokens/metadata/:address # Get metadata
POST   /tokens/metadata      # Update metadata
```

#### Security & Authentication (8 endpoints)
```
POST   /auth/login           # User login
POST   /auth/register        # User registration
POST   /auth/refresh         # Refresh token
POST   /auth/logout          # User logout
GET    /auth/profile         # Get user profile
POST   /auth/apikeys         # Create API key
GET    /auth/apikeys         # List API keys
DELETE /auth/apikeys/:id     # Delete API key
```

#### Smart Accounts (12 endpoints)
```
GET    /smart-accounts       # List smart accounts
POST   /smart-accounts       # Create smart account
GET    /smart-accounts/:id   # Get smart account
PUT    /smart-accounts/:id   # Update smart account
DELETE /smart-accounts/:id   # Delete smart account
POST   /smart-accounts/:id/auth # Authorize transaction
GET    /smart-accounts/:id/sessions # List sessions
POST   /smart-accounts/:id/sessions # Create session
DELETE /smart-accounts/:id/sessions/:sid # End session
GET    /smart-accounts/:id/transactions # Get transactions
```

#### MPC (10 endpoints)
```
GET    /mpc/wallets          # List MPC wallets
POST   /mpc/wallets          # Create MPC wallet
GET    /mpc/wallets/:id      # Get MPC wallet
DELETE /mpc/wallets/:id      # Delete MPC wallet
POST   /mpc/sign             # Sign with MPC
GET    /mpc/sessions         # List sessions
POST   /mpc/sessions         # Create session
GET    /mpc/sessions/:id     # Get session
POST   /mpc/sessions/:id/share # Submit signature share
```

#### SVM (8 endpoints)
```
GET    /svm/programs         # List programs
POST   /svm/programs         # Deploy program
GET    /svm/programs/:id     # Get program info
PUT    /svm/programs/:id     # Upgrade program
DELETE /svm/programs/:id     # Close program
POST   /svm/execute          # Execute instruction
GET    /svm/logs/:programId  # Get execution logs
GET    /svm/metrics          # Get SVM metrics
```

#### Events (10 endpoints)
```
GET    /events               # Get recent events
POST   /events/emit          # Emit custom event
GET    /events/stream        # SSE stream (Server-Sent Events)
GET    /events/history       # Query historical events
GET    /events/:id           # Get specific event
POST   /events/subscriptions # Create subscription
GET    /events/subscriptions # List subscriptions
GET    /events/subscriptions/:id # Get subscription
PUT    /events/subscriptions/:id # Update subscription
DELETE /events/subscriptions/:id # Delete subscription
```

#### CPI (6 endpoints)
```
GET    /cpi/programs         # List available programs
POST   /cpi/invoke           # Execute CPI
GET    /cpi/history          # CPI execution history
GET    /cpi/programs/:id     # Get program metadata
GET    /cpi/metrics          # CPI performance metrics
POST   /cpi/batch            # Batch CPI calls
```

### Testing Strategy

The application includes testing:

#### Test Structure
```
src/
├── **/__tests__/
│   ├── *.controller.spec.ts    # Controller unit tests
│   ├── *.service.spec.ts       # Service unit tests
│   └── *.integration.spec.ts   # Integration tests
├── database/__tests__/
│   ├── database-connection.controller.spec.ts
│   ├── database-performance.controller.spec.ts
│   └── migration.service.spec.ts
└── modules/**/__tests__/
    └── *.spec.ts               # Module-specific tests
```

#### Test Coverage Goals
- **Unit Tests**: 80%+ coverage for all services and controllers
- **Integration Tests**: End-to-end API testing
- **Database Tests**: Migration and performance testing
- **E2E Tests**: Full application workflow testing

#### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run specific test file
npm test -- accounts.controller.spec.ts

# Run integration tests
npm run test:e2e

# Run in watch mode
npm run test:watch
```

### Configuration Management

#### Environment Variables
```bash
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/solana_svm

# Solana
SOLANA_RPC_URL=http://localhost:8899
SOLANA_NETWORK=localnet

# Message Queue
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=solana-svm-api

# Caching
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# External Services
IPFS_GATEWAY=https://ipfs.io/ipfs/
METADATA_PROGRAM_ID=metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s
```

#### Docker Compose Services
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: solana_svm
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_INTERNAL:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092,PLAINTEXT_INTERNAL://kafka:29092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  solana-validator:
    image: solanalabs/solana:v1.18.4
    command: solana-test-validator --reset
    ports:
      - "8899:8899"
      - "8900:8900"
      - "9900:9900"

  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://user:password@postgres:5432/solana_svm
      - SOLANA_RPC_URL=http://solana-validator:8899
      - KAFKA_BROKERS=kafka:29092
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - kafka
      - redis
      - solana-validator
```

### Deployment Architecture

#### Local Development
- Docker Compose with hot reload
- Local Solana test validator
- File-based logging
- Development database

#### Production Deployment
- Kubernetes manifests in `infra/k8s/`
- Prometheus + Grafana monitoring
- PostgreSQL with connection pooling
- Redis for caching
- Load balancing and auto-scaling

#### Key Production Configurations
```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-svm-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: solana-svm-api
  template:
    metadata:
      labels:
        app: solana-svm-api
    spec:
      containers:
      - name: api
        image: solana-svm-api:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

This codebase provides a foundation for building Solana applications, with patterns, testing, and scalable architecture.

## Practical Implementation Examples

### Example 1: Creating a Token and Transferring It

```typescript
// 1. Create a new SPL token
const createTokenResponse = await fetch('http://localhost:3000/tokens', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'My Token',
    symbol: 'MTK',
    decimals: 9,
    initialSupply: 1000000000 // 1 billion tokens
  })
});

// 2. Mint additional tokens
const mintResponse = await fetch('http://localhost:3000/tokens/mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: 1000000, // 1 USDC
    recipient: 'your-wallet-address'
  })
});

// 3. Transfer tokens
const transferResponse = await fetch('http://localhost:3000/tokens/transfer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: 1000000,
    fromAddress: 'sender-wallet',
    toAddress: 'recipient-wallet'
  })
});
```

### Example 2: Smart Account Transaction Authorization

```typescript
// 1. Create a smart account
const smartAccount = await fetch('http://localhost:3000/smart-accounts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    owner: 'owner-public-key',
    threshold: 2, // Require 2 of 3 signatures
    signers: ['signer1', 'signer2', 'signer3']
  })
});

// 2. Create a transaction for authorization
const transaction = await fetch('http://localhost:3000/transactions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    smartAccountAddress: smartAccount.address,
    instructions: [{
      programId: 'system-program-id',
      accounts: ['account1', 'account2'],
      data: 'transfer-instruction-data'
    }],
    maxFee: 5000 // Max fee in lamports
  })
});

// 3. Authorize the transaction (requires multiple signatures)
const authorization = await fetch(`http://localhost:3000/smart-accounts/${smartAccount.address}/authorize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactionId: transaction.id,
    signature: 'signer-signature',
    signer: 'signer-public-key'
  })
});
```

### Example 3: Real-time Event Streaming

```typescript
// Subscribe to transaction events
const eventSource = new EventSource('http://localhost:3000/events/stream?filter=transactions');

eventSource.onmessage = (event) => {
  const transactionEvent = JSON.parse(event.data);
  console.log('New transaction:', transactionEvent);

  // Process different event types
  switch (transactionEvent.type) {
    case 'transaction.created':
      handleTransactionCreated(transactionEvent);
      break;
    case 'transaction.confirmed':
      handleTransactionConfirmed(transactionEvent);
      break;
    case 'transaction.failed':
      handleTransactionFailed(transactionEvent);
      break;
  }
};

// Create a custom event subscription
const subscription = await fetch('http://localhost:3000/events/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'large-transfers',
    filter: {
      type: 'transaction.confirmed',
      conditions: {
        amount: { gt: 1000000000 } // > 1 SOL
      }
    },
    webhook: 'https://my-app.com/webhooks/transfers'
  })
});
```

---

## Advanced Topics & Extensions

### Advanced SVM Concepts
- **Program State Compression**: Reducing account storage costs
- **Zero-Knowledge Proofs**: Privacy-preserving transactions
- **State Channels**: Off-chain transaction processing
- **Rollups**: Layer 2 scaling solutions

### DeFi Protocol Integration
- **AMM Implementation**: Automated market makers
- **Lending Protocols**: Supply and borrow mechanisms
- **Yield Farming**: Staking and reward systems
- **Liquidation Engines**: Risk management systems

### Cross-Chain Solutions
- **Bridge Protocols**: Cross-chain asset transfers
- **Oracles**: Real-world data integration
- **Multi-chain Wallets**: Unified asset management
- **Cross-chain Messaging**: Interoperability protocols

### Enterprise Features
- **Compliance Integration**: KYC/AML systems
- **Audit Trails**: Transaction logging
- **Multi-signature Governance**: DAO implementations
- **Regulatory Reporting**: Automated compliance

---

## Troubleshooting Guide

### Common Development Issues

#### Database Connection Problems
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U user -d solana_svm -c "SELECT version();"

# Reset database
docker-compose down -v
docker-compose up -d postgres
npm run migration:run
```

#### Kafka Messaging Issues
```bash
# Check Kafka broker status
docker-compose ps kafka

# View Kafka logs
docker-compose logs kafka

# Test Kafka connectivity
docker-compose exec kafka kafka-console-producer.sh --broker-list localhost:9092 --topic test

# Reset Kafka
docker-compose down -v
docker-compose up kafka zookeeper
```

#### Solana Validator Problems
```bash
# Check validator status
docker-compose ps solana-validator

# View validator logs
docker-compose logs solana-validator

# Test RPC connection
curl http://localhost:8899 -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Restart validator
docker-compose restart solana-validator
```

#### Application Startup Issues
```bash
# Check environment variables
cat .env

# Validate TypeScript compilation
npm run build

# Check for port conflicts
lsof -i :3000

# View application logs
docker-compose logs app

# Test health endpoint
curl http://localhost:3000/health
```

### Performance Optimization

#### Database Performance
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Analyze table statistics
ANALYZE accounts;
ANALYZE transactions;

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

#### Application Performance
```bash
# Profile application
npm run start:debug

# Check memory usage
docker stats

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/accounts
```

#### Network Optimization
```bash
# Test RPC latency
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getRecentBlockhash"}' \
  -w "@curl-format.txt" http://localhost:8899

# Monitor network requests
# Use browser dev tools or tools like mitmproxy
```

---

## FAQ - Frequently Asked Questions

### General Questions

**Q: Do I need prior blockchain experience?**
A: Basic familiarity with EVM concepts is helpful but not required. The course starts with fundamentals and compares EVM to SVM throughout.

**Q: What's the time commitment per week?**
A: 10-15 hours for part-time (16 weeks) or 20-25 hours for full-time (8 weeks). Includes coding, reading, and assignments.

**Q: Can I use Windows/Linux instead of macOS?**
A: Yes! The Docker setup works on all platforms. Adjust commands for your shell (PowerShell on Windows).

**Q: Is this course suitable for beginners?**
A: Intermediate level. You should know JavaScript/TypeScript and basic programming concepts.

### Technical Questions

**Q: Why does the Solana validator take so long to start?**
A: The test validator needs to bootstrap the genesis state and initialize accounts. This is normal and takes 1-2 minutes.

**Q: My tests are failing with database connection errors?**
A: Ensure Docker containers are running and migrations are applied. Check `.env` file for correct database URL.

**Q: How do I debug transaction failures?**
A: Check application logs, Solana validator logs, and use the `/transactions/{id}` endpoint to get detailed error information.

**Q: Why are my API calls returning 500 errors?**
A: Check application logs with `docker-compose logs app`. Common issues: missing environment variables, database connection problems, or Solana RPC issues.

### Project-Specific Questions

**Q: Can I deploy this to production as-is?**
A: The codebase includes production configurations, but you should:
- Set up proper secrets management
- Configure monitoring and alerting
- Implement rate limiting
- Add logging
- Perform security audit

**Q: How do I extend this for my specific use case?**
A: The modular architecture makes it easy to add new modules. Follow the existing patterns in `src/modules/`.

**Q: What's the difference between this and Anchor framework?**
A: This is a backend API for Solana applications. Anchor is for writing Solana programs (smart contracts). They complement each other.

**Q: Can I integrate this with existing DeFi protocols?**
A: Yes! The CPI module enables integration with existing Solana programs like Raydium, Jupiter, or Pyth.

### Career & Certification Questions

**Q: What jobs can I get after completing this course?**
A: Blockchain Developer, DeFi Engineer, Smart Contract Developer, Backend Engineer (blockchain focus), Solutions Architect.

**Q: Is the certification recognized by employers?**
A: The portfolio project and skills demonstrated are more valuable than certificates. Focus on building impressive projects.

**Q: How do I showcase this project to employers?**
A: Deploy it publicly, create a demo video, document the architecture, and highlight the technologies used.

**Q: What's the best way to learn more after this course?**
A: Contribute to open source Solana projects, build your own dApps, join hackathons, and follow Solana ecosystem developments.

---

## Real-World Project Examples

### Example Project 1: DeFi Dashboard
**Description**: Build a DeFi portfolio tracker
**Features**:
- Multi-wallet support (Phantom, Solflare, Ledger)
- Real-time balance tracking across tokens
- Transaction history and analytics
- Yield farming opportunity scanner
- Risk assessment and alerts

**Technologies Used**: React frontend, this API backend, WebSocket for real-time updates

### Example Project 2: NFT Marketplace
**Description**: Create a Solana-based NFT marketplace
**Features**:
- NFT minting and metadata management
- Auction and fixed-price sales
- Royalty enforcement
- Collection management
- Trading analytics

**Technologies Used**: Next.js frontend, Metaplex SDK integration, IPFS for metadata

### Example Project 3: DAO Governance Platform
**Description**: Build a decentralized autonomous organization platform
**Features**:
- Proposal creation and voting
- Multi-signature execution
- Treasury management
- Member onboarding
- Governance analytics

**Technologies Used**: This API for backend, custom Solana programs for governance logic

### Example Project 4: Cross-Chain Bridge
**Description**: Implement a token bridge between Solana and Ethereum
**Features**:
- Lock/mint mechanism
- Multi-signature validation
- Event monitoring and automation
- Fee optimization
- Security monitoring

**Technologies Used**: Wormhole protocol integration, multi-chain RPC management

---

## Career Development & Job Market

### Current Job Market (December 2025)

**High-Demand Roles**:
- **Solana Developer**: $120k-$200k USD
- **DeFi Engineer**: $130k-$220k USD
- **Blockchain Backend Engineer**: $110k-$180k USD
- **Smart Contract Developer**: $125k-$210k USD

**Top Companies Hiring**:
- **Solana Labs**: Core protocol development
- **Phantom**: Wallet infrastructure
- **Helium**: IoT blockchain solutions
- **Magic Eden**: NFT marketplace
- **Raydium**: DEX development
- **Jupiter**: Aggregator protocols

### Skills That Matter Most

**Technical Skills**:
- Rust programming (for Solana programs)
- TypeScript/JavaScript
- React/Next.js for frontends
- Docker and Kubernetes
- Database design (PostgreSQL)
- API design and development

**Blockchain-Specific Skills**:
- Solana program development
- SPL token standards
- DeFi protocol knowledge
- Cross-program invocations
- Security best practices
- Performance optimization

**Soft Skills**:
- Problem-solving in distributed systems
- Understanding economic incentives
- Security mindset
- Community engagement

### Getting Your First Job

**Step 1: Build Projects**
- Complete this course capstone project
- Build additional personal projects
- Contribute to open source

**Step 2: Network**
- Join Solana Discord and forums
- Attend Solana events and hackathons
- Connect with developers on LinkedIn

**Step 3: Apply**
- Tailor resume to highlight blockchain experience
- Prepare for technical interviews
- Showcase your GitHub portfolio

**Step 4: Interview Preparation**
- Study system design for blockchain applications
- Practice coding interviews
- Prepare DeFi and Solana-specific questions

### Salary Negotiation Tips

**Know Your Worth**:
- Research market rates on Levels.fyi
- Consider location and experience
- Factor in crypto/blockchain premium

**Negotiation Strategies**:
- Lead with your strongest projects
- Highlight unique blockchain experience
- Consider equity in crypto startups
- Don't forget benefits and remote work options

---

## Course Maintenance & Updates

### Version History

**Version 1.0** (December 2025)
- Initial course release
- Complete NestJS API implementation
- Kubernetes deployment configurations
- Testing suite

**Planned Updates**:
- **Version 1.1**: Add Rust program examples
- **Version 1.2**: Include Anchor framework integration
- **Version 2.0**: Multi-chain support (Ethereum, BSC, Polygon)

### Contributing to the Course

**Ways to Contribute**:
- Report bugs and issues
- Suggest improvements
- Submit pull requests
- Create tutorial content
- Share success stories

**Contribution Guidelines**:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request
6. Participate in code review

### Community Support

**Getting Help**:
- GitHub Issues for bugs
- GitHub Discussions for questions
- Discord community for real-time chat
- Stack Overflow for technical questions

**Mentorship Program**:
- Experienced developers available for 1:1 mentoring
- Code review sessions
- Career guidance
- Project feedback

---

*This course helps developers learn Solana development and contribute to the ecosystem.*