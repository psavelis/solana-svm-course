import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { Token } from './token.entity';
import { NFTListing } from './nft-listing.entity';
import { NFTBid } from './nft-bid.entity';
import { NFTSale } from './nft-sale.entity';
import { RedisModule } from '../../common/redis/redis.module';
import { QueryCacheService } from '../../common/cache/query-cache.service';

describe('TokensController', () => {
  let controller: TokensController;
  let service: TokensService;
  let mockRepository: Partial<Repository<Token>>;
  let mockQueryCacheService: Partial<QueryCacheService>;

  const mockToken: Token = {
    id: 'test-id',
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    supply: '1000000000000',
    owner: 'test-owner',
    isNft: false,
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

    mockQueryCacheService = {
      executeWithCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [RedisModule],
      controllers: [TokensController],
      providers: [
        TokensService,
        {
          provide: getRepositoryToken(Token),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(NFTListing),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })),
          },
        },
        {
          provide: getRepositoryToken(NFTBid),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(NFTSale),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: QueryCacheService,
          useValue: mockQueryCacheService,
        },
      ],
    }).compile();

    controller = module.get<TokensController>(TokensController);
    service = module.get<TokensService>(TokensService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new token', async () => {
      const createData = {
        mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        name: 'USD Coin',
      };
      jest.spyOn(service, 'create').mockResolvedValue(mockToken);

      const result = await controller.create(createData);

      expect(service.create).toHaveBeenCalledWith(createData);
      expect(result).toEqual(mockToken);
    });
  });

  describe('findAll', () => {
    it('should return all tokens', async () => {
      const tokens = [mockToken];
      jest.spyOn(service, 'findAll').mockResolvedValue(tokens);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(tokens);
    });
  });

  describe('findOne', () => {
    it('should return token by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockToken);

      const result = await controller.findOne('test-id');

      expect(service.findOne).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockToken);
    });
  });

  describe('findByMint', () => {
    it('should return token by mint address', async () => {
      jest.spyOn(service, 'findByMint').mockResolvedValue(mockToken);

      const result = await controller.findByMint('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

      expect(service.findByMint).toHaveBeenCalledWith(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );
      expect(result).toEqual(mockToken);
    });
  });

  describe('update', () => {
    it('should update token', async () => {
      const updateData = { name: 'Updated Token' };
      const updatedToken = { ...mockToken, name: 'Updated Token' };
      jest.spyOn(service, 'update').mockResolvedValue(updatedToken);

      const result = await controller.update('test-id', updateData);

      expect(service.update).toHaveBeenCalledWith('test-id', updateData);
      expect(result).toEqual(updatedToken);
    });
  });

  describe('remove', () => {
    it('should delete token', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove('test-id');

      expect(service.remove).toHaveBeenCalledWith('test-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getTokenInfo', () => {
    it('should get token info from Solana', async () => {
      const tokenInfo = {
        mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        supply: '1000000000000',
        decimals: 6,
        owner: 'test-owner',
      };
      jest.spyOn(service, 'getTokenInfo').mockResolvedValue(tokenInfo);

      const result = await controller.getTokenInfo('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

      expect(service.getTokenInfo).toHaveBeenCalledWith(
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );
      expect(result).toEqual(tokenInfo);
    });
  });

  describe('getTokenBalance', () => {
    it('should get token balance for owner', async () => {
      const balance = '1000000';
      jest.spyOn(service, 'getTokenBalance').mockResolvedValue(balance);

      const result = await controller.getTokenBalance(
        'owner-address',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );

      expect(service.getTokenBalance).toHaveBeenCalledWith(
        'owner-address',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      );
      expect(result).toEqual(balance);
    });
  });

  describe('getTokenAccounts', () => {
    it('should get all token accounts for owner', async () => {
      const tokenAccounts = [
        {
          address: 'owner-address',
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          amount: '500000',
        },
      ];
      jest.spyOn(service, 'getTokenAccounts').mockResolvedValue(tokenAccounts);

      const result = await controller.getTokenAccounts('owner-address');

      expect(service.getTokenAccounts).toHaveBeenCalledWith('owner-address');
      expect(result).toEqual(tokenAccounts);
    });
  });
});
