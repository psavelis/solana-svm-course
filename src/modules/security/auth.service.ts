import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { ApiKey, ApiKeyPermission } from './entities/api-key.entity';
import { RegisterUserDto, LoginUserDto, CreateApiKeyDto } from './dto/auth.dto';

@Injectable()
/**
 * Service for Authentication and Security.
 * @see docs/diagrams/12-security-practices.md
 */
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterUserDto): Promise<{ user: User; token: string }> {
    this.logger.log(`Registering user: ${dto.email}`);

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Create user
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role || UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateJwtToken(savedUser);

    return { user: savedUser, token };
  }

  /**
   * Authenticate user login
   */
  async login(dto: LoginUserDto): Promise<{ user: User; token: string }> {
    this.logger.log(`Login attempt for: ${dto.email}`);

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user can attempt login
    if (!user.canAttemptLogin()) {
      throw new UnauthorizedException('Account is locked or inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset login attempts and update last login
    user.loginAttempts = 0;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Generate JWT token
    const token = this.generateJwtToken(user);

    return { user, token };
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUserById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * Create API key for user
   */
  async createApiKey(
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    this.logger.log(`Creating API key for user: ${userId}`);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate secure API key
    const plainKey = this.generateSecureApiKey();
    const keyHash = await bcrypt.hash(plainKey, 12);
    const keyPrefix = plainKey.substring(0, 8);

    // Parse expiration date
    let expiresAt: Date | undefined;
    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        throw new BadRequestException('Invalid expiration date');
      }
    }

    const apiKey = this.apiKeyRepository.create({
      userId,
      name: dto.name,
      description: dto.description || '',
      keyHash,
      keyPrefix,
      permission: (dto.permission as ApiKeyPermission) || ApiKeyPermission.READ,
      expiresAt,
    });

    const savedApiKey = await this.apiKeyRepository.save(apiKey);

    return { apiKey: savedApiKey, plainKey };
  }

  /**
   * Validate API key
   */
  async validateApiKey(apiKey: string): Promise<ApiKey | null> {
    // Find API key by prefix first for performance
    const keyPrefix = apiKey.substring(0, 8);
    const apiKeys = await this.apiKeyRepository.find({
      where: { keyPrefix },
      relations: ['user'],
    });

    for (const key of apiKeys) {
      const isValid = await bcrypt.compare(apiKey, key.keyHash);
      if (isValid && key.isValid()) {
        // Update usage statistics
        key.lastUsedAt = new Date();
        key.usageCount += 1;
        await this.apiKeyRepository.save(key);

        return key;
      }
    }

    return null;
  }

  /**
   * Get user's API keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await this.apiKeyRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new BadRequestException('API key not found');
    }

    apiKey.status = 'revoked' as any;
    await this.apiKeyRepository.save(apiKey);
  }

  /**
   * Generate JWT token
   */
  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = this.configService.get('JWT_EXPIRES_IN', '24h');

    return this.jwtService.sign(payload, { expiresIn });
  }

  /**
   * Generate secure API key
   */
  private generateSecureApiKey(): string {
    return 'sk_' + crypto.randomBytes(32).toString('hex');
  }

  /**
   * Handle failed login attempt
   */
  private async handleFailedLogin(user: User): Promise<void> {
    user.loginAttempts += 1;

    // Lock account after 5 failed attempts
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      this.logger.warn(`Account locked for user: ${user.email}`);
    }

    await this.userRepository.save(user);
  }
}
