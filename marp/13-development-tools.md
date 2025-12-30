---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 13: Development Tools'
footer: 'Solana SVM Architecture'
---

# Module 13: Development Tools and Frameworks

## Complete Development Environment

---

## Development Stack Overview

### Core Technologies
- **NestJS**: Node.js framework for scalable server-side applications
- **TypeScript**: Typed JavaScript for better development experience
- **PostgreSQL**: Advanced open-source relational database
- **Redis**: In-memory data structure store for caching
- **Kafka**: Distributed event streaming platform
- **Docker**: Containerization for consistent environments

### Development Principles
- **Type Safety**: Full TypeScript integration
- **Test-Driven Development**: Comprehensive testing framework
- **Code Quality**: Automated linting and formatting
- **Containerization**: Consistent development and deployment
- **API Documentation**: Auto-generated OpenAPI specifications

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│               Core Framework                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 NestJS Framework                     │   │
│  │  • @nestjs/core, @nestjs/common → Core modules     │   │
│  │  • Dependency injection → Service management       │   │
│  │  • Module system → Application structure           │   │
│  │  • Decorators: @Controller, @Service, @Module      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  NestJS CLI                         │   │
│  │  • nest build/start → Build & run commands         │   │
│  │  • nest generate → Code scaffolding                │   │
│  │  • Project structure → Automated setup             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Build & Compilation                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             TypeScript Compiler                      │   │
│  │  • tsconfig.json → TypeScript configuration         │   │
│  │  • Type checking → Compile-time validation         │   │
│  │  • Source maps → Debug support                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 NPM Scripts                         │   │
│  │  • build → nest build (production)                 │   │
│  │  • start:dev → Watch mode development              │   │
│  │  • start:prod → Optimized production build         │   │
│  │  • test → Jest test execution                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Testing Framework                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Jest Testing                        │   │
│  │  • Unit tests → *.spec.ts files                      │   │
│  │  • test:watch → Continuous testing                   │   │
│  │  • test:cov → Coverage reporting                    │   │
│  │  • jest-e2e.json → E2E configuration                │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Supertest                           │   │
│  │  • HTTP endpoint testing → API validation          │   │
│  │  • Integration tests → End-to-end workflows        │   │
│  │  • Request/response validation → Contract testing  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Code Quality Tools                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  ESLint                              │   │
│  │  • @typescript-eslint → TypeScript rules            │   │
│  │  • Code linting → Quality enforcement               │   │
│  │  • --fix → Auto-correction                          │   │
│  │  • Prettier integration → Consistent formatting     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Prettier                            │   │
│  │  • Code formatting → Consistent style               │   │
│  │  • format script → Automated formatting             │   │
│  │  • Editor integration → Real-time formatting        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             External Integrations                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Database Tools                          │   │
│  │  • TypeORM CLI → Migration management               │   │
│  │  • PostgreSQL → Primary database                    │   │
│  │  • Connection pooling → Performance optimization    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Infrastructure                          │   │
│  │  • Docker → Containerization                        │   │
│  │  • Docker Compose → Multi-service orchestration     │   │
│  │  • Kafka, Redis, PostgreSQL → Service dependencies │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             API Documentation                       │   │
│  │  • Swagger/OpenAPI → Auto-generated docs           │   │
│  │  • Interactive testing → API exploration           │   │
│  │  • Schema generation → TypeScript integration      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Development Dependencies                 │   │
│  │  • ts-node → Runtime TypeScript compilation        │   │
│  │  • tsconfig-paths → Path mapping support            │   │
│  │  • source-map-support → Debug capabilities         │   │
│  │  • @types/* → TypeScript type definitions          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## NestJS Framework

### Core Architecture
```typescript
// Main application module
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot(databaseConfig),
    AuthModule,
    AccountsModule,
    TransactionsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// Controller with dependency injection
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  @Post()
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }
}

// Service with business logic
@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private accountsRepository: Repository<Account>,
  ) {}

  async findAll(): Promise<Account[]> {
    return this.accountsRepository.find();
  }

  async create(createAccountDto: CreateAccountDto): Promise<Account> {
    const account = this.accountsRepository.create(createAccountDto);
    return this.accountsRepository.save(account);
  }
}
```

### Module System
```typescript
// Feature module
@Module({
  imports: [TypeOrmModule.forFeature([Account])],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}

// Global module
@Global()
@Module({
  imports: [ConfigModule],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
```

---

## TypeScript Configuration

### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"],
      "@/common/*": ["src/common/*"],
      "@/modules/*": ["src/modules/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

### Path Mapping Benefits
- **Clean Imports**: `@/modules/accounts/accounts.service` instead of `../../../modules/accounts/accounts.service`
- **Refactoring Safety**: Path changes don't break imports
- **IDE Support**: Better autocomplete and navigation
- **Build Optimization**: TypeScript resolves paths at compile time

---

## Testing Framework

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

### Unit Testing Example
```typescript
// accounts.service.spec.ts
describe('AccountsService', () => {
  let service: AccountsService;
  let mockRepository: MockType<Repository<Account>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useFactory: jest.fn(() => ({
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          })),
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
    mockRepository = module.get(getRepositoryToken(Account));
  });

  it('should return all accounts', async () => {
    const mockAccounts = [{ id: '1', address: 'test' }];
    mockRepository.find.mockReturnValue(mockAccounts);

    const result = await service.findAll();
    expect(result).toEqual(mockAccounts);
    expect(mockRepository.find).toHaveBeenCalled();
  });
});
```

### E2E Testing with Supertest
```typescript
// accounts.e2e-spec.ts
describe('Accounts (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/accounts (GET)', () => {
    return request(app.getHttpServer())
      .get('/accounts')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });

  it('/accounts (POST)', () => {
    return request(app.getHttpServer())
      .post('/accounts')
      .send({
        address: '11111111111111111111111111111112',
        owner: 'test-owner'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.address).toBe('11111111111111111111111111111112');
      });
  });
});
```

---

## Code Quality Tools

### ESLint Configuration
```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'prettier',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
```

### Prettier Configuration
```javascript
// .prettierrc.js
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 2,
  semi: true,
  printWidth: 100,
  endOfLine: 'lf',
};
```

### NPM Scripts for Quality
```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"test/**/*.ts\"",
    "quality": "npm run lint && npm run format:check && npm run test"
  }
}
```

---

## Database Tools

### TypeORM Configuration
```typescript
// data-source.ts
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'solana_svm',
  synchronize: false, // Use migrations in production
  logging: process.env.NODE_ENV === 'development',
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/database/migrations/*{.ts,.js}'],
  subscribers: ['dist/database/subscribers/*{.ts,.js}'],
});
```

### Migration Management
```typescript
// Migration example
export class CreateAccountsTable1640000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'account',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'address',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'owner',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'balance',
            type: 'bigint',
            default: 0,
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('account');
  }
}
```

### NPM Scripts for Database
```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-esm migration:generate",
    "migration:run": "typeorm-ts-node-esm migration:run",
    "migration:revert": "typeorm-ts-node-esm migration:revert",
    "schema:sync": "typeorm-ts-node-esm schema:sync"
  }
}
```

---

## Docker & Infrastructure

### Multi-Stage Dockerfile
```dockerfile
# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=development /app/dist ./dist
COPY --from=development /app/migrations ./migrations
USER node
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### Docker Compose Configuration
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: solana_svm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  kafka:
    image: confluentinc/cp-kafka:7.3.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    ports:
      - "9092:9092"

  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

volumes:
  postgres_data:
  redis_data:
```

---

## API Documentation

### Swagger Integration
```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Solana SVM Study API')
    .setDescription('API for Solana SVM blockchain operations')
    .setVersion('1.0')
    .addTag('accounts', 'Account management endpoints')
    .addTag('transactions', 'Transaction operations')
    .addTag('signing', 'Cryptographic signing operations')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
```

### Controller Documentation
```typescript
@Controller('accounts')
@ApiTags('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiResponse({ status: 200, description: 'List of accounts', type: [Account] })
  async findAll(): Promise<Account[]> {
    return this.accountsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create new account' })
  @ApiResponse({ status: 201, description: 'Account created', type: Account })
  @ApiBody({ type: CreateAccountDto })
  async create(@Body() createAccountDto: CreateAccountDto): Promise<Account> {
    return this.accountsService.create(createAccountDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Account found', type: Account })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findOne(@Param('id') id: string): Promise<Account> {
    return this.accountsService.findOne(id);
  }
}
```

---

## Development Workflow

### Development Scripts
```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }
}
```

### Development Environment Setup
```bash
# Install dependencies
npm install

# Start development database
docker-compose up -d postgres redis

# Run database migrations
npm run migration:run

# Start development server
npm run start:dev

# Run tests
npm run test

# Check code quality
npm run lint
npm run format
```

---

## Key Takeaways

### Development Environment Benefits
- **Full-Stack TypeScript**: Type safety from database to API
- **Comprehensive Testing**: Unit and integration test coverage
- **Code Quality Automation**: Linting and formatting enforcement
- **Containerized Development**: Consistent environments across teams
- **API Documentation**: Auto-generated, interactive documentation

### Tool Integration Benefits
- **NestJS Framework**: Scalable, maintainable application structure
- **TypeORM**: Type-safe database operations with migrations
- **Jest + Supertest**: Complete testing framework for APIs
- **Docker Compose**: Multi-service development environment
- **Swagger**: Professional API documentation and testing