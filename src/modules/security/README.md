# Security Module

This module implements in-depth security features for the Solana SVM Study API, including authentication, authorization, and cryptographic security measures.

## Features Implemented

### 🔐 Authentication & Authorization

#### JWT Authentication
- User registration and login with email/password
- JWT token-based authentication
- Secure password hashing with bcrypt
- Token expiration and refresh capabilities

#### API Key Authentication
- API key generation and management
- Multiple permission levels (read, write, admin)
- API key expiration and revocation
- Secure key hashing and validation

#### Role-Based Access Control (RBAC)
- User roles: Admin, User, Readonly
- Route-level role restrictions
- Hierarchical permission system

#### Rate Limiting
- Configurable request throttling
- Protection against abuse and DoS attacks
- Per-user and global rate limits

### 🔒 Cryptographic Security

#### Secure Key Management
- Environment-based secret configuration
- Secure random key generation
- Proper key lifecycle management

#### Data Protection
- Password hashing with salt rounds
- API key secure storage
- Encrypted sensitive data handling

#### Signature Verification
- JWT token validation
- API key authentication verification
- Secure random number generation

## API Endpoints

### Authentication
```
POST /auth/register - Register new user
POST /auth/login - User login
GET /auth/profile - Get user profile (JWT required)
```

### API Key Management
```
POST /auth/api-keys - Create API key (JWT required)
GET /auth/api-keys - List user API keys (JWT required)
DELETE /auth/api-keys/:id - Revoke API key (JWT required)
```

### Admin Endpoints
```
GET /auth/admin/users - List all users (Admin role required)
```

## Security Configuration

Add to your `.env` file:
```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=86400

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100
```

## Usage Examples

### JWT Authentication
```typescript
// Login
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const { token } = await response.json();

// Use JWT token
const protectedResponse = await fetch('/auth/profile', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### API Key Authentication
```typescript
// Create API key
const response = await fetch('/auth/api-keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My API Key',
    permission: 'read'
  })
});

const { apiKey, plainKey } = await response.json();

// Use API key (save plainKey securely!)
const apiResponse = await fetch('/some-endpoint', {
  headers: {
    'X-API-Key': plainKey
  }
});
```

### Role-Based Access
```typescript
// Admin-only endpoint
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@Get('admin/users')
async getAllUsers() {
  // Only accessible to admin users
}
```

## Security Best Practices

1. **Environment Variables**: Never commit secrets to version control
2. **Password Policies**: Enforce strong password requirements
3. **Token Expiration**: Use reasonable JWT expiration times
4. **Rate Limiting**: Configure appropriate limits for your use case
5. **API Key Security**: Store API keys securely, rotate regularly
6. **Audit Logging**: Log security events for monitoring
7. **HTTPS Only**: Always use HTTPS in production
8. **Input Validation**: Validate all user inputs thoroughly

## Testing

Run security tests:
```bash
npm test -- --testPathPattern=auth.service.spec.ts
```

## Architecture

```
SecurityModule
├── AuthService - Core authentication logic
├── AuthController - Authentication endpoints
├── User Entity - User data model
├── ApiKey Entity - API key data model
├── JwtStrategy - JWT token validation
├── ApiKeyStrategy - API key validation
├── JwtAuthGuard - JWT authentication guard
├── ApiKeyAuthGuard - API key authentication guard
├── RolesGuard - Role-based access control
└── Roles Decorator - Route-level role restrictions
```

## Future Enhancements

- OAuth2 integration
- Multi-factor authentication (MFA)
- Session management
- Advanced audit logging
- Security event monitoring
- Password reset functionality
- Account lockout policies