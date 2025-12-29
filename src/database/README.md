# Database Migration System

This module provides a in-depth database migration system for managing PostgreSQL schema changes in production environments. It implements proper versioning, rollback capabilities, and migration tracking.

## Features

- **Schema Versioning**: Track database schema changes with timestamps
- **Migration Tracking**: Store executed migrations in dedicated table
- **Rollback Support**: Safely rollback migrations in reverse order
- **Migration Generation**: Create new migration files with templates
- **Status Monitoring**: View migration status and statistics
- **Error Handling**: Graceful failure handling with detailed logging
- **TypeORM Integration**: Full integration with TypeORM migration system

## Migration Files Structure

Migrations are stored in `src/database/migrations/` with the naming convention:
```
{timestamp}-{MigrationName}.ts
```

Example:
```
1735512000000-CreateAccountsTable.ts
1735512000001-CreateTransactionsTable.ts
1735512000002-CreateTokensTable.ts
```

## API Endpoints

### Get All Migrations
```http
GET /migrations
```

**Response:**
```json
[
  {
    "name": "1735512000000-CreateAccountsTable",
    "timestamp": 1735512000000,
    "executed": true
  },
  {
    "name": "1735512000001-CreateTransactionsTable",
    "timestamp": 1735512000001,
    "executed": false
  }
]
```

### Get Migration Statistics
```http
GET /migrations/stats
```

**Response:**
```json
{
  "total": 3,
  "executed": 2,
  "pending": 1,
  "lastExecuted": "1735512000001-CreateTransactionsTable"
}
```

### Run Pending Migrations
```http
POST /migrations/run
```

**Response:**
```json
{
  "success": true,
  "executedMigrations": ["1735512000001-CreateTransactionsTable"],
  "failedMigrations": [],
  "errors": []
}
```

### Rollback Last Migration
```http
POST /migrations/rollback
```

**Response:**
```json
{
  "success": true,
  "executedMigrations": ["1735512000001-CreateTransactionsTable"],
  "failedMigrations": [],
  "errors": []
}
```

### Create New Migration
```http
POST /migrations/create
Content-Type: application/json

{
  "name": "AddUserTable"
}
```

**Response:** `"src/database/migrations/1735512000003-AddUserTable.ts"`

## Migration File Template

New migrations are created with this template:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserTable1735512000003 implements MigrationInterface {
  name = 'AddUserTable';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add migration logic here
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add rollback logic here
  }
}
```

## Command Line Tools

The system integrates with TypeORM CLI for additional migration management:

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

## Migration Best Practices

### Writing Migrations

1. **Always provide rollback logic** in the `down()` method
2. **Test migrations** on a copy of production data first
3. **Use transactions** for multi-step migrations
4. **Keep migrations small** and focused on single changes
5. **Document complex migrations** with comments

### Example Migration

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddUserTable1735512000003 implements MigrationInterface {
  name = 'AddUserTable';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Add index
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex('users', 'IDX_users_email');

    // Drop table
    await queryRunner.dropTable('users');
  }
}
```

## Database Schema

### Migrations Table

The system automatically creates a `migrations` table to track executed migrations:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

### Initial Schema

The system includes initial migrations for:

- **accounts**: Store Solana account information
- **transactions**: Track blockchain transactions
- **tokens**: Manage SPL token metadata

## Error Handling

The migration system provides in-depth error handling:

- **Failed migrations** are logged with detailed error messages
- **Partial execution** is prevented by transaction rollback
- **Migration conflicts** are detected and reported
- **Network issues** are handled with retry logic

## Security Considerations

- **Validate migration content** before execution
- **Backup database** before running migrations in production
- **Test migrations** in staging environment first
- **Monitor execution time** for performance issues
- **Audit migration history** for compliance

## Integration with Development Workflow

### Development
- Use `npm run migration:create` to create new migrations
- Run migrations locally with `npm run migration:run`
- Test rollbacks with `npm run migration:revert`

### Staging
- Deploy migrations with application code
- Run migrations automatically on startup
- Monitor migration execution logs

### Production
- Include migrations in deployment package
- Run migrations during deployment window
- Have rollback plan ready
- Monitor migration performance

## Monitoring and Logging

The system provides detailed logging:

- √ **Successful migrations** with execution time
- x **Failed migrations** with error details
- 📊 **Statistics** on migration status
- 🔄 **Rollback operations** with confirmation

## Dependencies

- `@nestjs/common`: NestJS framework
- `@nestjs/typeorm`: TypeORM integration
- `typeorm`: Database ORM with migration support
- `pg`: PostgreSQL driver

## Future Enhancements

- **Migration dependencies** for complex schema changes
- **Data migrations** for transforming existing data
- **Migration testing** framework
- **Automated rollbacks** on deployment failures
- **Migration performance** monitoring