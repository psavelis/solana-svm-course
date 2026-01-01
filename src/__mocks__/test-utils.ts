import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { MockConnection, createMockConnection } from './solana-connection.mock';
import { setupSplTokenMocks } from './spl-token.mock';
import { setupWeb3Mocks } from './web3.mock';

// Test database configuration
export const testDbConfig = {
  type: 'sqlite' as const,
  database: ':memory:',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  dropSchema: true,
  logging: false,
};

// Mock services
export class MockServices {
  static connection = createMockConnection();
  static splToken = setupSplTokenMocks();
  static web3 = setupWeb3Mocks();

  static resetAllMocks() {
    this.connection.clearMockResponses();
    this.splToken.resetAllMocks();
    this.web3.resetAllMocks();
  }
}

// Test module builder
export class TestModuleBuilder {
  private entities: any[] = [];
  private providers: any[] = [];
  private imports: any[] = [];

  withEntities(...entities: any[]) {
    this.entities = entities;
    return this;
  }

  withProviders(...providers: any[]) {
    this.providers = providers;
    return this;
  }

  withImports(...imports: any[]) {
    this.imports = imports;
    return this;
  }

  async build(): Promise<TestingModule> {
    const dbConfig = {
      ...testDbConfig,
      entities: this.entities,
    };

    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot(dbConfig),
        TypeOrmModule.forFeature(this.entities),
        ...this.imports,
      ],
      providers: [
        ...this.providers,
        // Provide mock connection
        {
          provide: 'SOLANA_CONNECTION',
          useValue: MockServices.connection,
        },
      ],
    }).compile();
  }
}

// Repository helpers
export class RepositoryHelpers {
  static async createEntity<T>(
    repository: Repository<T>,
    data: Partial<T>
  ): Promise<T> {
    const entity = repository.create(data as any);
    return repository.save(entity as any) as Promise<T>;
  }

  static async clearRepository<T>(repository: Repository<T>): Promise<void> {
    await repository.clear();
  }
}

// Blockchain interaction helpers
export class BlockchainHelpers {
  static mockAccountInfo(address: string, accountInfo: any) {
    MockServices.connection.setMockResponse(`accountInfo-${address}`, accountInfo);
  }

  static mockBalance(address: string, balance: number) {
    MockServices.connection.setMockResponse(`balance-${address}`, balance);
  }

  static mockTransactionSignature(signature: string) {
    // Mock transaction confirmation
    jest.spyOn(MockServices.connection, 'sendAndConfirmTransaction')
      .mockResolvedValueOnce(signature);
  }

  static mockTokenAccount(mint: string, owner: string, account: any) {
    MockServices.splToken.getAccount.mockResolvedValueOnce(account);
  }

  static mockAssociatedTokenAddress(mint: string, owner: string, ata: string) {
    MockServices.splToken.getAssociatedTokenAddress
      .mockResolvedValueOnce(new (require('@solana/web3.js').PublicKey)(ata));
  }
}

// Test data factories
export class TestDataFactory {
  static solanaAddress(): string {
    return '11111111111111111111111111111112'; // System program address
  }

  static tokenMint(): string {
    return 'So11111111111111111111111111111111111111112'; // Wrapped SOL
  }

  static userWallet(): string {
    return 'User' + Math.random().toString(36).substring(2, 15);
  }

  static transactionSignature(): string {
    return 'tx_' + Math.random().toString(36).substring(2, 15);
  }
}

// Global test setup
export function setupTestEnvironment() {
  beforeEach(() => {
    MockServices.resetAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
}

// Export everything
export {
  MockConnection,
  createMockConnection,
  setupSplTokenMocks,
  setupWeb3Mocks,
};