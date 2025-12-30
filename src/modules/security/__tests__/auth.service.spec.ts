import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { ApiKey, ApiKeyPermission } from '../entities/api-key.entity';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let apiKeyRepository: Repository<ApiKey>;
  let jwtService: JwtService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockApiKeyRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockApiKeyRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    apiKeyRepository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: '1',
        ...dto,
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockConfigService.get.mockReturnValue('24h');

      const result = await service.register(dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'jwt-token',
      });
    });

    it('should throw error if user already exists', async () => {
      const dto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUserRepository.findOne.mockResolvedValue({ id: '1', email: dto.email });

      await expect(service.register(dto)).rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: '1',
        email: dto.email,
        passwordHash: 'hashed-password',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        canAttemptLogin: jest.fn().mockReturnValue(true),
        loginAttempts: 0,
        lastLoginAt: null,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockConfigService.get.mockReturnValue('24h');

      // Mock bcrypt functions
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.login(dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        user: mockUser,
        token: 'jwt-token',
      });
    });

    it('should throw error for invalid credentials', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockUser = {
        id: '1',
        email: dto.email,
        passwordHash: 'hashed-password',
        canAttemptLogin: jest.fn().mockReturnValue(true),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Mock bcrypt functions
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('createApiKey', () => {
    it('should create API key successfully', async () => {
      const userId = 'user-1';
      const dto = {
        name: 'Test API Key',
        description: 'Test description',
        permission: 'read',
      };

      const mockUser = { id: userId, email: 'test@example.com' };
      const mockApiKey = {
        id: 'key-1',
        userId,
        name: dto.name,
        description: dto.description,
        permission: ApiKeyPermission.READ,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockApiKeyRepository.create.mockReturnValue(mockApiKey);
      mockApiKeyRepository.save.mockResolvedValue(mockApiKey);

      // Mock crypto functions
      const crypto = require('crypto');
      jest.spyOn(crypto, 'randomBytes').mockReturnValue(Buffer.from('test-key-32-chars-long-string'));

      // Mock bcrypt hash
      const bcrypt = require('bcrypt');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-api-key');

      const result = await service.createApiKey(userId, dto);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockApiKeyRepository.create).toHaveBeenCalled();
      expect(mockApiKeyRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        apiKey: mockApiKey,
        plainKey: expect.stringContaining('sk_'),
      });
    }, 10000); // Increase timeout for this test
  });
});