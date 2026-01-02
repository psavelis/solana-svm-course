import { Controller, Post, Body, Get, UseGuards, Request, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto, LoginUserDto, CreateApiKeyDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entities/user.entity';

/**
 * # Authentication Controller
 *
 * REST API for user authentication, API key management, and authorization.
 *
 * ## Authentication Flow
 *
 * ```
 * [Client] → POST /auth/register → [Create User]
 *                                       ↓
 * [Client] → POST /auth/login    → [Validate + Issue JWT]
 *                                       ↓
 * [Client] → GET /auth/profile   → [Verify JWT → Return User]
 *            (Authorization: Bearer <token>)
 * ```
 *
 * ## API Key Authentication
 *
 * For server-to-server communication:
 *
 * ```
 * [Create API Key] → Store hashed key in DB
 *                         ↓
 * [Client Request] → X-API-Key header
 *                         ↓
 * [Validate Key] → Check hash, scopes, expiry
 * ```
 *
 * ## Security Features
 *
 * | Feature | Description |
 * |---------|-------------|
 * | Password Hashing | bcrypt with salt rounds |
 * | JWT Tokens | Short-lived access tokens |
 * | API Keys | Scoped, expirable server keys |
 * | Rate Limiting | Prevent brute force |
 * | Role-Based Access | User, Admin roles |
 *
 * ## Authorization
 *
 * Protected endpoints require:
 * - Valid JWT token (Bearer auth)
 * - Or valid API key (X-API-Key header)
 * - Appropriate role (for admin endpoints)
 *
 * @example
 * ```typescript
 * // Register new user
 * POST /auth/register
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123",
 *   "walletAddress": "9WzDXw..."
 * }
 *
 * // Login and get token
 * POST /auth/login
 * {
 *   "email": "user@example.com",
 *   "password": "securePassword123"
 * }
 * // Response: { "accessToken": "eyJhbG...", "expiresIn": 3600 }
 *
 * // Create API key for integrations
 * POST /auth/api-keys
 * Authorization: Bearer <jwt>
 * {
 *   "name": "My Integration",
 *   "scopes": ["read:transactions", "write:transfers"],
 *   "expiresAt": "2024-12-31"
 * }
 * ```
 *
 * @see [docs/diagrams/12-security-practices.md](docs/diagrams/12-security-practices.md) - Security Architecture
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async register(@Body() dto: RegisterUserDto) {
    return await this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() dto: LoginUserDto) {
    return await this.authService.login(dto);
  }

  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create API key' })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  async createApiKey(@Request() req, @Body() dto: CreateApiKeyDto) {
    return await this.authService.createApiKey(req.user.id, dto);
  }

  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user API keys' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  async getApiKeys(@Request() req) {
    return await this.authService.getUserApiKeys(req.user.id);
  }

  @Delete('api-keys/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  async revokeApiKey(@Request() req, @Param('id') apiKeyId: string) {
    await this.authService.revokeApiKey(req.user.id, apiKeyId);
    return { message: 'API key revoked successfully' };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Get('admin/users')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers() {
    // This would typically call a user service
    return { message: 'Admin endpoint - list all users' };
  }
}
