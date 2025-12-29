# Solana SVM Study Repository

A learning and implementation platform for Solana and SVM (Solana Virtual Machine) development, designed for developers transitioning from EVM-based chains like Ethereum and Polygon.

## Overview

This repository implements a NestJS-based API service that demonstrates Solana integrations, featuring:
- PostgreSQL database for data persistence
- Kafka for asynchronous messaging
- Docker Compose for containerized deployment
- Solana feature implementations
- Enterprise-grade architecture following SOLID principles

## Study Materials

📚 **[Study Guide](docs/STUDY.md)** - Breakdown of Solana concepts with EVM comparisons

📋 **[Master Iteration Plan](docs/MASTER-ITERATION.md)** - Project objectives, design patterns, and development roadmap

📝 **[Implementation Tasks](docs/TASKS.md)** - Detailed task breakdown for all features

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
- Blockchain: Solana Web3.js, SVM integrations
- Containerization: Docker & Docker Compose
- Testing: Jest with code coverage reporting

## Quick Start

### Prerequisites
- Node.js 18+
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

3. Start the services:
```bash
docker-compose up -d
```

4. Run the application:
```bash
npm run start:dev
```

### Environment Setup

Create a `.env` file with the following variables:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/solana_study
KAFKA_BROKERS=localhost:9092
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_private_key_here
```

## API Documentation

Once running, access the API documentation at `http://localhost:3000/api`

## Key Features

### Solana Integrations
- Account management and PDAs
- Token operations (SPL tokens)
- Transaction building and signing
- Program interactions
- Event monitoring

### Advanced Capabilities
- Multi-party computation (MPC) for secure signing
- Account abstraction patterns
- Fee optimization
- Cross-program invocations

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