import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { Account } from '../modules/accounts/account.entity';
import { Token } from '../modules/tokens/token.entity';
import { Transaction } from '../modules/transactions/transaction.entity';
import { User } from '../modules/security/entities/user.entity';
import { ApiKey } from '../modules/security/entities/api-key.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'solana_study',
  entities: [Account, Token, Transaction, User, ApiKey],
  migrations: ['src/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
