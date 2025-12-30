import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsService } from './accounts.service';
import { Account } from './account.entity';

// Mock Solana web3.js
jest.mock('@solana/web3.js', () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getAccountInfo: jest.fn(),
    getBalance: jest.fn(),
  })),
  PublicKey: jest.fn(),
}));

describe('AccountsService', () => {
  let service: AccountsService;
  let mockRepository: Partial<Repository<Account>>;

  const mockAccount: Account = {
    id: 'test-id',
    address: '11111111111111111111111111111112',
    balance: 1000000,
    owner: 'test-owner',
    isPda: false,
    programId: null,
    metadata: { test: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockReturnValue(mockAccount),
      save: jest.fn().mockResolvedValue(mockAccount),
      find: jest.fn().mockResolvedValue([mockAccount]),
      findOne: jest.fn().mockResolvedValue(mockAccount),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save an account', async () => {
      const createData = { address: '11111111111111111111111111111112', balance: 1000000 };

      const result = await service.create(createData);

      expect(mockRepository.create).toHaveBeenCalledWith(createData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockAccount);
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockAccount]);
    });
  });

  describe('findOne', () => {
    it('should return account by id', async () => {
      const result = await service.findOne('test-id');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-id' } });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findByAddress', () => {
    it('should return account by address', async () => {
      const result = await service.findByAddress('11111111111111111111111111111112');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { address: '11111111111111111111111111111112' } });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('update', () => {
    it('should update account and return updated account', async () => {
      const updateData = { balance: 2000000 };

      const result = await service.update('test-id', updateData);

      expect(mockRepository.update).toHaveBeenCalledWith('test-id', updateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-id' } });
      expect(result).toEqual(mockAccount);
    });
  });

  describe('remove', () => {
    it('should delete account', async () => {
      await service.remove('test-id');

      expect(mockRepository.delete).toHaveBeenCalledWith('test-id');
    });
  });

  describe('getAccountInfo', () => {
    it('should get account info from blockchain', async () => {
      const mockAccountInfo = {
        lamports: 1000000,
        data: Buffer.from('test-data'),
        owner: { toString: () => 'test-owner' },
        executable: false,
        rentEpoch: 0,
      };

      // Mock the connection in the service
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
      };
      (service as any).connection = mockConnection;

      const result = await service.getAccountInfo('11111111111111111111111111111112');

      expect(mockConnection.getAccountInfo).toHaveBeenCalled();
      expect(result).toEqual({
        address: '11111111111111111111111111111112',
        exists: true,
        lamports: 1000000,
        owner: 'test-owner',
        executable: false,
        data: 'dGVzdC1kYXRh', // base64 encoded 'test-data'
      });
    });

    it('should handle account not found', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(null),
      };
      (service as any).connection = mockConnection;

      const result = await service.getAccountInfo('11111111111111111111111111111112');

      expect(result).toEqual({
        address: '11111111111111111111111111111112',
        exists: false,
        lamports: 0,
        owner: undefined,
        executable: false,
        data: undefined,
      });
    });

    it('should handle errors', async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error('Connection failed')),
      };
      (service as any).connection = mockConnection;

      await expect(service.getAccountInfo('invalid-address')).rejects.toThrow('Failed to get account info: Connection failed');
    });
  });

  describe('getBalance', () => {
    it('should get account balance', async () => {
      const mockConnection = {
        getBalance: jest.fn().mockResolvedValue(1000000),
      };
      (service as any).connection = mockConnection;

      const result = await service.getBalance('11111111111111111111111111111112');

      expect(mockConnection.getBalance).toHaveBeenCalled();
      expect(result).toBe(1000000);
    });

    it('should handle errors', async () => {
      const mockConnection = {
        getBalance: jest.fn().mockRejectedValue(new Error('Connection failed')),
      };
      (service as any).connection = mockConnection;

      await expect(service.getBalance('invalid-address')).rejects.toThrow('Failed to get balance: Connection failed');
    });
  });
});