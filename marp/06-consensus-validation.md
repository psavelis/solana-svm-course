---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 6: Consensus & Validation'
footer: 'Solana SVM Architecture'
---

# Module 6: Consensus and Validation

## Multi-Layer Security & Validation Framework

---

## Validation Architecture Overview

### Validation Layers
- **Authentication**: JWT tokens, API keys, role-based access
- **Input Validation**: DTO validation, data transformation
- **Business Logic**: Transaction validation, program execution
- **External Checks**: Solana network validation
- **Database**: TypeORM constraints and relationships

### Security Principles
- **Defense in Depth**: Multiple validation layers
- **Fail-Fast**: Early validation prevents unnecessary processing
- **Comprehensive Coverage**: All data paths validated
- **Error Transparency**: Clear error messages and codes

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Authentication Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Auth Guards & Strategies                  │   │
│  │  • JwtAuthGuard → JWT Token Validation              │   │
│  │  • ApiKeyAuthGuard → API Key Validation             │   │
│  │  • RolesGuard → Role-based Access Control           │   │
│  │  • JwtStrategy → JWT Passport Strategy              │   │
│  │  • ApiKeyStrategy → API Key Passport Strategy       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 Service Layer                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               AuthService                            │   │
│  │  • validateUser() → Password Validation             │   │
│  │  • validateApiKey() → API Key Verification          │   │
│  │  • generateToken() → JWT Token Generation           │   │
│  │  • hashPassword() → Bcrypt Password Hashing         │   │
│  │  • verifyPassword() → Password Verification         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Transaction Validation Service              │   │
│  │  • Signature Validation → Ed25519 Verification      │   │
│  │  • Balance Checks → Sufficient Funds                │   │
│  │  • Account Ownership → Authority Validation         │   │
│  │  • Program Permissions → Instruction Validation     │   │
│  │  • Fee Validation → Fee Estimate Validation         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Security Entities                       │   │
│  │  • User Entity: Email, Password, Role, Status       │   │
│  │  • ApiKey Entity: Key, Permissions, Expires         │   │
│  │  • UserRole Enum: ADMIN, USER, MODERATOR            │   │
│  │  • UserStatus Enum: ACTIVE, INACTIVE, SUSPENDED     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             External Integrations                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Solana Network                           │   │
│  │  • Account Info → On-chain Verification              │   │
│  │  • Transaction Status → Confirmation Checks          │   │
│  │  • Program Accounts → Program State Validation       │   │
│  │  • Token Balances → SPL Token Validation             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Entity Constraints → Unique Constraints           │   │
│  │  • Column Validation → Type Checking                 │   │
│  │  • Relation Validation → Foreign Key Checks          │   │
│  │  • Migration Validation → Schema Consistency         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Pipeline

### Request Processing Flow
```
1. 🔐 Auth Guards → JWT/API Key Check
2. ✅ Input Validation → DTO/Class Validation
3. 🎯 Business Rules → Service Layer Validation
4. 🌐 External Checks → Solana Network Validation
5. 💾 Database Ops → TypeORM Constraints
6. 📤 Response → Validated Data
```

### Pipeline Benefits
- **Sequential Processing**: Each layer builds on previous validation
- **Early Failure**: Invalid requests rejected quickly
- **Resource Efficiency**: Only valid requests reach expensive operations
- **Audit Trail**: Complete validation history for debugging

---

## Authentication & Authorization

### Auth Guards Implementation
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### Role-Based Access Control
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!requiredRoles) return true;

    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

---

## Transaction Validation

### Signature Validation
```typescript
validateTransactionSignature(transaction: Transaction): boolean {
  try {
    // Verify all required signatures
    for (const signature of transaction.signatures) {
      const message = transaction.serializeMessage();
      const isValid = nacl.sign.detached.verify(
        message,
        signature.signature,
        signature.publicKey.toBytes()
      );

      if (!isValid) {
        throw new BadRequestException('Invalid transaction signature');
      }
    }
    return true;
  } catch (error) {
    throw new BadRequestException('Transaction signature validation failed');
  }
}
```

### Balance & Authority Checks
```typescript
async validateTransaction(transaction: Transaction): Promise<void> {
  // Check sufficient balance
  const feePayerBalance = await this.connection.getBalance(transaction.feePayer);
  const estimatedFee = await this.feeService.getFeeEstimate(transaction);

  if (feePayerBalance < estimatedFee.totalFee) {
    throw new BadRequestException('Insufficient balance for transaction fee');
  }

  // Validate account ownership for instructions
  for (const instruction of transaction.instructions) {
    await this.validateInstructionAuthority(instruction);
  }
}
```

---

## Program Execution Validation

### SVM Runtime Validation
```typescript
validateProgramExecution(programId: PublicKey, instruction: TransactionInstruction): void {
  // Validate program exists and is executable
  const accountInfo = await this.connection.getAccountInfo(programId);
  if (!accountInfo) {
    throw new NotFoundException('Program account not found');
  }

  if (!accountInfo.executable) {
    throw new BadRequestException('Account is not executable');
  }

  // Check compute unit limits
  const estimatedCU = this.estimateComputeUnits(instruction);
  if (estimatedCU > MAX_COMPUTE_UNITS) {
    throw new BadRequestException('Instruction exceeds compute unit limit');
  }

  // Validate instruction data format
  this.validateInstructionData(instruction);
}
```

### Parallel Execution Safety
- **Resource Allocation**: Ensure sufficient compute units available
- **Memory Bounds**: Validate memory access within limits
- **Cross-Program Calls**: Verify CPI permissions and data flow
- **State Consistency**: Maintain atomicity across parallel operations

---

## Smart Account Validation

### Rule-Based Validation
```typescript
async validateSmartAccountTransaction(
  smartAccount: SmartAccount,
  transaction: Transaction
): Promise<ValidationResult> {

  // Check account status
  if (smartAccount.status !== SmartAccountStatus.ACTIVE) {
    return { valid: false, reason: 'Smart account is not active' };
  }

  // Validate daily spending limit
  const dailySpent = await this.getDailySpending(smartAccount.address);
  const transactionAmount = this.calculateTransactionAmount(transaction);

  if (dailySpent + transactionAmount > smartAccount.rules.maxDailySpend) {
    return { valid: false, reason: 'Daily spending limit exceeded' };
  }

  // Check program whitelist
  const allowedPrograms = new Set(smartAccount.rules.allowedPrograms);
  for (const ix of transaction.instructions) {
    if (!allowedPrograms.has(ix.programId.toString())) {
      return { valid: false, reason: 'Program not in whitelist' };
    }
  }

  return { valid: true };
}
```

---

## Input Validation & DTOs

### Class Validator Integration
```typescript
import { IsNotEmpty, IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  role: UserRole;
}

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsString()
  fromAddress: string;

  @IsNotEmpty()
  @IsString()
  toAddress: string;

  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  memo?: string;
}
```

### Global Validation Pipe
```typescript
@Injectable()
export class ValidationPipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException(this.formatErrors(errors));
    }

    return object;
  }
}
```

---

## Error Handling & Responses

### Standardized Error Responses
```typescript
export class ValidationErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

// Example error responses
const errors = {
  400: { statusCode: 400, message: 'Validation failed', error: 'Bad Request' },
  401: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
  403: { statusCode: 403, message: 'Forbidden', error: 'Forbidden' },
  404: { statusCode: 404, message: 'Not found', error: 'Not Found' },
  409: { statusCode: 409, message: 'Conflict', error: 'Conflict' }
};
```

### Exception Filters
```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message || 'Internal server error'
    });
  }
}
```

---

## Database Validation

### TypeORM Entity Validation
```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE
  })
  status: UserStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Migration Validation
```typescript
export class CreateUserTable1640000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'user',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()'
          },
          // ... other columns
        ],
        indices: [
          { columnNames: ['email'], isUnique: true }
        ]
      })
    );
  }
}
```

---

## Key Takeaways

### Validation Framework Benefits
- **Multi-Layer Security**: Authentication, authorization, and business rules
- **Comprehensive Coverage**: All data inputs and operations validated
- **Performance Optimized**: Early validation prevents unnecessary processing
- **Developer Experience**: Clear error messages and validation feedback

### SVM Consensus Advantages
- **Cryptographic Security**: Ed25519 signature validation
- **Parallel Validation**: High-throughput transaction processing
- **State Consistency**: Atomic validation across all operations
- **Network Security**: On-chain verification of all state changes