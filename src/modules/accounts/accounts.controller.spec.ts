import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Account } from './account.entity';

describe('AccountsController', () => {
  let controller: AccountsController;
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
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        AccountsService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<AccountsController>(AccountsController);
    service = module.get<AccountsService>(AccountsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new account', async () => {
      const createData = { address: '11111111111111111111111111111112', balance: 1000000 };
      jest.spyOn(service, 'create').mockResolvedValue(mockAccount);

      const result = await controller.create(createData);

      expect(service.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findAll', () => {
    it('should return all accounts', async () => {
      const accounts = [mockAccount];
      jest.spyOn(service, 'findAll').mockResolvedValue(accounts);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(accounts);
    });
  });

  describe('findOne', () => {
    it('should return account by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockAccount);

      const result = await controller.findOne('test-id');

      expect(service.findOne).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockAccount);
    });
  });

  describe('findByAddress', () => {
    it('should return account by address', async () => {
      jest.spyOn(service, 'findByAddress').mockResolvedValue(mockAccount);

      const result = await controller.findByAddress('11111111111111111111111111111112');

      expect(service.findByAddress).toHaveBeenCalledWith('11111111111111111111111111111112');
      expect(result).toEqual(mockAccount);
    });
  });

  describe('update', () => {
    it('should update account', async () => {
      const updateData = { balance: 2000000 };
      const updatedAccount = { ...mockAccount, balance: 2000000 };
      jest.spyOn(service, 'update').mockResolvedValue(updatedAccount);

      const result = await controller.update('test-id', updateData);

      expect(service.update).toHaveBeenCalledWith('test-id', updateData);
      expect(result).toEqual(updatedAccount);
    });
  });

  describe('remove', () => {
    it('should delete account', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove('test-id');

      expect(service.remove).toHaveBeenCalledWith('test-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getAccountInfo', () => {
    it('should get account info from blockchain', async () => {
      const accountInfo = {
        address: '11111111111111111111111111111112',
        exists: true,
        lamports: 1000000,
        owner: 'test-owner',
        executable: false,
        data: 'dGVzdC1kYXRh', // base64 encoded 'test-data'
      };
      jest.spyOn(service, 'getAccountInfo').mockResolvedValue(accountInfo);

      const result = await controller.getAccountInfo('11111111111111111111111111111112');

      expect(service.getAccountInfo).toHaveBeenCalledWith('11111111111111111111111111111112');
      expect(result).toEqual(accountInfo);
    });
  });

  describe('getBalance', () => {
    it('should get account balance', async () => {
      const balance = 1000000;
      jest.spyOn(service, 'getBalance').mockResolvedValue(balance);

      const result = await controller.getBalance('11111111111111111111111111111112');

      expect(service.getBalance).toHaveBeenCalledWith('11111111111111111111111111111112');
      expect(result).toEqual(balance);
    });
  });
});