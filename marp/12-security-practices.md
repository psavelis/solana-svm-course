---
marp: true
theme: default
size: 16:9
paginate: true
header: 'Module 12: Security Practices'
footer: 'Solana SVM Architecture'
---

# Module 12: Security and Best Practices

## Comprehensive Security Framework

---

## Security Architecture Overview

### Multi-Layer Security
- **Authentication**: JWT tokens and API key validation
- **Authorization**: Role-based access control and permissions
- **Input Validation**: Comprehensive data sanitization
- **Rate Limiting**: API usage controls and abuse prevention
- **Audit Logging**: Complete security event tracking

### Security Principles
- **Defense in Depth**: Multiple security layers
- **Least Privilege**: Minimum required permissions
- **Fail-Safe Defaults**: Secure default configurations
- **Complete Auditing**: All security events logged

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AuthController                         │   │
│  │  • POST /auth/register → register()                 │   │
│  │  • POST /auth/login → login()                       │   │
│  │  • POST /auth/api-keys → createApiKey()             │   │
│  │  • GET /auth/api-keys → getApiKeys()                │   │
│  │  • DELETE /auth/api-keys/:id → revokeApiKey()       │   │
│  │  • GET /auth/profile → getProfile()                 │   │
│  │  • GET /auth/admin/users → getAllUsers()            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Authentication Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Auth Guards                          │   │
│  │  • JwtAuthGuard → JWT Bearer token validation       │   │
│  │  • ApiKeyAuthGuard → X-API-Key header validation    │   │
│  │  • RolesGuard → @Roles() decorator validation       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            Auth Strategies                          │   │
│  │  • JwtStrategy → JWT payload validation            │   │
│  │  • ApiKeyStrategy → API key verification           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               AuthService                            │   │
│  │  • login() → bcrypt password verification           │   │
│  │  • register() → bcrypt hash + JWT generation        │   │
│  │  • validateUserById() → User lookup & status check  │   │
│  │  • createApiKey() → bcrypt key hashing              │   │
│  │  • validateApiKey() → bcrypt key comparison         │   │
│  │  • getUserApiKeys() → API key listing               │   │
│  │  • revokeApiKey() → API key deactivation            │   │
│  │  • handleFailedLogin() → attempt counter & locking  │   │
│  │  • generateJwtToken() → JWT token signing           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Security Entities                        │   │
│  │  • User Entity: Authentication & profile data       │   │
│  │  • ApiKey Entity: API key management & tracking     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│             External Integrations                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Security Features                        │   │
│  │  • Password Security → bcrypt hashing               │   │
│  │  • Account Locking → Failed attempt protection      │   │
│  │  • Rate Limiting → API usage controls               │   │
│  │  • Permission System → Role-based access            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │             Validation Pipes                        │   │
│  │  • class-validator → Input validation decorators    │   │
│  │  • class-transformer → Data transformation          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Database                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            PostgreSQL + TypeORM                       │   │
│  │  • Repository<User> → User authentication storage    │   │
│  │  • Repository<ApiKey> → API key management           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Guards

### JWT Authentication Guard
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext): boolean {
    // Allow access to auth endpoints without token
    const request = context.switchToHttp().getRequest();
    const isAuthEndpoint = request.url.includes('/auth/');

    if (isAuthEndpoint) {
      return true;
    }

    // Validate JWT token for protected endpoints
    return super.canActivate(context);
  }
}
```

### API Key Authentication Guard
```typescript
@Injectable()
export class ApiKeyAuthGuard extends AuthGuard('api-key') {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Extract API key from header
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Allow access to auth endpoints
    const isAuthEndpoint = request.url.includes('/auth/');
    if (isAuthEndpoint) {
      return true;
    }

    return super.canActivate(context);
  }
}
```

### Role-Based Access Control
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

---

## Authentication Strategies

### JWT Strategy Implementation
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.authService.validateUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    return user;
  }
}
```

### API Key Strategy Implementation
```typescript
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private authService: AuthService) {
    super();
  }

  async authenticate(req: Request): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      this.fail('API key missing', 401);
      return;
    }

    try {
      const result = await this.authService.validateApiKey(apiKey);

      if (!result.isValid) {
        this.fail('Invalid API key', 401);
        return;
      }

      // Update usage statistics
      await this.authService.updateApiKeyUsage(result.apiKey.id);

      this.success({
        user: result.user,
        apiKey: result.apiKey
      });
    } catch (error) {
      this.fail('API key validation failed', 401);
    }
  }
}
```

---

## Security Entities

### User Entity
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

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ nullable: true })
  lockedUntil?: Date;

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

  // Business logic methods
  isLocked(): boolean {
    return this.lockedUntil && this.lockedUntil > new Date();
  }

  canAttemptLogin(): boolean {
    return !this.isLocked() && this.status === UserStatus.ACTIVE;
  }
}
```

### API Key Entity
```typescript
@Entity()
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  keyHash: string;  // bcrypt hashed full key

  @Column()
  keyPrefix: string;  // First 8 characters for identification

  @ManyToOne(() => User)
  user: User;

  @Column({
    type: 'enum',
    enum: ApiKeyPermission,
    default: ApiKeyPermission.READ
  })
  permission: ApiKeyPermission;

  @Column({
    type: 'enum',
    enum: ApiKeyStatus,
    default: ApiKeyStatus.ACTIVE
  })
  status: ApiKeyStatus;

  @Column({ nullable: true })
  expiresAt?: Date;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ default: 0 })
  usageCount: number;

  @Column({ default: 100 })  // requests per minute
  rateLimit: number;

  @CreateDateColumn()
  createdAt: Date;

  // Business logic methods
  isValid(): boolean {
    return this.status === ApiKeyStatus.ACTIVE &&
           (!this.expiresAt || this.expiresAt > new Date());
  }

  hasPermission(requiredPermission: ApiKeyPermission): boolean {
    const permissionHierarchy = {
      [ApiKeyPermission.READ]: 1,
      [ApiKeyPermission.WRITE]: 2,
      [ApiKeyPermission.ADMIN]: 3
    };

    return permissionHierarchy[this.permission] >= permissionHierarchy[requiredPermission];
  }
}
```

---

## Password Security

### Password Hashing & Verification
```typescript
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Validate password strength
    this.validatePasswordStrength(registerDto.password);

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(registerDto.password);

    // Create user
    const user = this.userRepository.create({
      email: registerDto.email,
      passwordHash,
      role: UserRole.USER
    });

    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateJwtToken(user);

    return { user, token };
  }
}
```

### Password Strength Validation
```typescript
validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new BadRequestException('Password must be at least 8 characters long');
  }

  if (!/(?=.*[a-z])/.test(password)) {
    throw new BadRequestException('Password must contain at least one lowercase letter');
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    throw new BadRequestException('Password must contain at least one uppercase letter');
  }

  if (!/(?=.*\d)/.test(password)) {
    throw new BadRequestException('Password must contain at least one number');
  }

  if (!/(?=.*[@$!%*?&])/.test(password)) {
    throw new BadRequestException('Password must contain at least one special character');
  }
}
```

---

## Account Protection

### Failed Login Handling
```typescript
async handleFailedLogin(email: string): Promise<void> {
  const user = await this.userRepository.findOne({ where: { email } });

  if (!user) {
    // Don't reveal if user exists
    return;
  }

  user.loginAttempts += 1;

  // Lock account after 5 failed attempts
  if (user.loginAttempts >= 5) {
    user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    user.loginAttempts = 0; // Reset counter
  }

  await this.userRepository.save(user);
}

async login(loginDto: LoginDto): Promise<AuthResponse> {
  const user = await this.userRepository.findOne({
    where: { email: loginDto.email }
  });

  if (!user) {
    throw new UnauthorizedException('Invalid credentials');
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new UnauthorizedException('Account is temporarily locked');
  }

  // Verify password
  const isPasswordValid = await this.verifyPassword(loginDto.password, user.passwordHash);

  if (!isPasswordValid) {
    await this.handleFailedLogin(loginDto.email);
    throw new UnauthorizedException('Invalid credentials');
  }

  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockedUntil = null;
  await this.userRepository.save(user);

  // Generate token
  const token = this.generateJwtToken(user);

  return { user, token };
}
```

---

## API Key Management

### API Key Creation & Validation
```typescript
async createApiKey(userId: string, createDto: CreateApiKeyDto): Promise<ApiKeyResponse> {
  // Generate random API key
  const apiKeyValue = crypto.randomBytes(32).toString('hex');

  // Hash the full key for storage
  const keyHash = await bcrypt.hash(apiKeyValue, 12);

  // Store first 8 characters for identification
  const keyPrefix = apiKeyValue.substring(0, 8);

  // Create API key entity
  const apiKey = this.apiKeyRepository.create({
    keyHash,
    keyPrefix,
    user: { id: userId } as User,
    permission: createDto.permission || ApiKeyPermission.READ,
    expiresAt: createDto.expiresAt,
    rateLimit: createDto.rateLimit || 100
  });

  await this.apiKeyRepository.save(apiKey);

  // Return the actual key (only time it's shown)
  return {
    id: apiKey.id,
    key: apiKeyValue,  // Full key returned only once
    keyPrefix,
    permission: apiKey.permission,
    expiresAt: apiKey.expiresAt,
    rateLimit: apiKey.rateLimit
  };
}

async validateApiKey(apiKeyValue: string): Promise<ApiKeyValidationResult> {
  // Find API key by prefix (first 8 chars)
  const keyPrefix = apiKeyValue.substring(0, 8);

  const apiKey = await this.apiKeyRepository.findOne({
    where: { keyPrefix },
    relations: ['user']
  });

  if (!apiKey || !apiKey.isValid()) {
    return { isValid: false };
  }

  // Verify full key against hash
  const isKeyValid = await bcrypt.compare(apiKeyValue, apiKey.keyHash);

  if (!isKeyValid) {
    return { isValid: false };
  }

  return {
    isValid: true,
    user: apiKey.user,
    apiKey
  };
}
```

---

## Rate Limiting & Usage Tracking

### API Key Rate Limiting
```typescript
async updateApiKeyUsage(apiKeyId: string): Promise<void> {
  const apiKey = await this.apiKeyRepository.findOne({
    where: { id: apiKeyId }
  });

  if (!apiKey) return;

  // Update usage statistics
  apiKey.usageCount += 1;
  apiKey.lastUsedAt = new Date();

  await this.apiKeyRepository.save(apiKey);
}

async checkRateLimit(apiKey: ApiKey): Promise<boolean> {
  if (!apiKey.lastUsedAt) {
    return true; // No usage yet
  }

  const now = new Date();
  const timeSinceLastUse = now.getTime() - apiKey.lastUsedAt.getTime();
  const requestsPerMs = apiKey.rateLimit / 60000; // per minute to per ms

  // Simple rate limiting: ensure minimum time between requests
  const minIntervalMs = 1000 / requestsPerMs;

  return timeSinceLastUse >= minIntervalMs;
}
```

---

## Input Validation & Sanitization

### DTO Validation with Class Validator
```typescript
import { IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class LoginDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;
}

export class CreateApiKeyDto {
  @IsOptional()
  @IsEnum(ApiKeyPermission)
  permission?: ApiKeyPermission;

  @IsOptional()
  expiresAt?: Date;

  @IsOptional()
  @Min(1)
  @Max(1000)
  rateLimit?: number;
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

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): any {
    return errors.reduce((result, error) => {
      result[error.property] = Object.values(error.constraints || {});
      return result;
    }, {});
  }
}
```

---

## API Endpoints

### Authentication Endpoints
- `POST /auth/register` - User registration with password validation
- `POST /auth/login` - User login with account locking protection
- `GET /auth/profile` - Get current user profile
- `GET /auth/admin/users` - Admin endpoint for user management

### API Key Management
- `POST /auth/api-keys` - Create new API key
- `GET /auth/api-keys` - List user's API keys
- `DELETE /auth/api-keys/:id` - Revoke API key

### Security Configuration
```typescript
// main.ts
app.useGlobalPipes(new ValidationPipe());
app.useGlobalGuards(new JwtAuthGuard(), new RolesGuard());
app.use(helmet());  // Security headers
app.use(rateLimit({  // Rate limiting
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

---

## Key Takeaways

### Security Framework Benefits
- **Multi-Factor Authentication**: JWT + API key support
- **Comprehensive Protection**: Password security, account locking, rate limiting
- **Role-Based Access**: Hierarchical permission system
- **Complete Auditing**: All security events tracked

### Implementation Best Practices
- **bcrypt Hashing**: Industry-standard password security
- **JWT Tokens**: Stateless authentication with expiration
- **Input Validation**: Prevent injection and malformed data
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Audit Logging**: Complete security event tracking