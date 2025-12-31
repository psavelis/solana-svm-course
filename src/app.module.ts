import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KafkaModule } from "./common/kafka/kafka.module";
import { RedisModule } from "./common/redis/redis.module";
import { HealthModule } from "./common/health/health.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { SmartAccountsModule } from "./modules/smart-accounts/smart-accounts.module";
import { TokensModule } from "./modules/tokens/tokens.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { SigningModule } from "./modules/signing/signing.module";
import { FeeModule } from "./modules/fee/fee.module";
import { MpcModule } from "./modules/mpc/mpc.module";
import { SvmModule } from "./modules/svm/svm.module";
import { CpiModule } from "./modules/cpi/cpi.module";
import { EventsModule } from "./modules/events/events.module";
import { SecurityModule } from "./modules/security/security.module";
import { NetworkModule } from "./modules/network/network.module";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "password",
      database: process.env.DB_DATABASE || "solana_study",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      migrations: [__dirname + "/database/migrations/*{.ts,.js}"],
      migrationsTableName: "migrations",
      synchronize: false, // Disable in production, use migrations instead
      logging: process.env.NODE_ENV === "development",
      // Connection pool configuration
      extra: {
        // Minimum number of connections to maintain
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        // Maximum number of connections
        max: parseInt(process.env.DB_POOL_MAX) || 20,
        // Maximum time to wait for a connection from the pool (60 seconds)
        acquireTimeoutMillis:
          parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT) || 60000,
        // Maximum time a connection can be idle before being released (30 seconds)
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
        // Maximum time to wait for a connection to be established (10 seconds)
        connectionTimeoutMillis:
          parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 10000,
        // Allow creating connections when pool is at max capacity
        allowExitOnIdle: true,
        // Enable connection validation
        keepAlive: true,
        // Keep alive initial delay
        keepAliveInitialDelayMillis: 0,
      },
      // Retry configuration
      retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS) || 3,
      retryDelay: parseInt(process.env.DB_RETRY_DELAY) || 1000,
    }),
    KafkaModule,
    RedisModule,
    HealthModule,
    AccountsModule,
    SmartAccountsModule,
    TokensModule,
    TransactionsModule,
    SigningModule,
    FeeModule,
    MpcModule,
    SvmModule,
    CpiModule,
    EventsModule,
    SecurityModule,
    NetworkModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
