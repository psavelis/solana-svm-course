import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { KafkaModule } from './common/kafka/kafka.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';

/**
 * Test utilities for consistent test setup across the application
 */
export class TestUtils {
  /**
   * Creates a basic testing module with common dependencies
   */
  static async createTestingModule(metadata?: {
    imports?: any[];
    controllers?: any[];
    providers?: any[];
    exports?: any[];
  }): Promise<TestingModule> {
    const imports = [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'],
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        inject: [ConfigService],
      }),
      CacheModule.register({
        isGlobal: true,
        ttl: 300,
      }),
      RedisModule,
      KafkaModule,
      DatabaseModule,
      ...(metadata?.imports || []),
    ];

    return Test.createTestingModule({
      imports,
      controllers: metadata?.controllers || [],
      providers: metadata?.providers || [],
      exports: metadata?.exports || [],
    }).compile();
  }

  /**
   * Creates mock data for testing
   */
  static createMockData() {
    return {
      account: {
        id: 'test-account-id',
        address: '11111111111111111111111111111112',
        owner: 'test-owner',
        balance: 1000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      token: {
        id: 'test-token-id',
        mint: 'So11111111111111111111111111111111111111112',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 9,
        supply: 1000000000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      transaction: {
        id: 'test-tx-id',
        signature: 'test-signature',
        status: 'confirmed',
        blockTime: Date.now(),
        fee: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  /**
   * Creates mock blockchain responses
   */
  static createMockBlockchainResponses() {
    return {
      accountInfo: {
        lamports: 1000000,
        data: Buffer.from('test-data'),
        owner: '11111111111111111111111111111112',
        executable: false,
        rentEpoch: 0,
      },
      tokenAccount: {
        mint: 'So11111111111111111111111111111111111111112',
        owner: '11111111111111111111111111111112',
        amount: '1000000000',
        delegate: null,
        delegatedAmount: '0',
        isInitialized: true,
        isFrozen: false,
        isNative: false,
        rentExemptReserve: null,
        closeAuthority: null,
      },
      transaction: {
        blockTime: Date.now(),
        meta: {
          fee: 5000,
          preBalances: [1000000],
          postBalances: [950000],
          err: null,
        },
        slot: 12345,
        transaction: {
          message: {
            accountKeys: ['11111111111111111111111111111112'],
            instructions: [],
            recentBlockhash: 'test-blockhash',
          },
          signatures: ['test-signature'],
        },
      },
    };
  }

  /**
   * Waits for a specified amount of time
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generates a random string for testing
   */
  static generateRandomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generates a random number within a range
   */
  static generateRandomNumber(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}