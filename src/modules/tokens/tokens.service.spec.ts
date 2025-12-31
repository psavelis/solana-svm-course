import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TokensService } from "./tokens.service";
import { Token } from "./token.entity";
import { NFTListing } from "./nft-listing.entity";
import { NFTBid } from "./nft-bid.entity";
import { NFTSale } from "./nft-sale.entity";

// Mock Solana web3.js and spl-token
jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getAccountInfo: jest.fn(),
    getTokenAccountsByOwner: jest.fn(),
  })),
  PublicKey: jest.fn(),
}));

jest.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  getAssociatedTokenAddress: jest.fn(),
  getAccount: jest.fn(),
}));

describe("TokensService", () => {
  let service: TokensService;
  let mockRepository: Partial<Repository<Token>>;

  const mockToken: Token = {
    id: "test-id",
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    supply: "1000000000000",
    owner: "test-owner",
    isNft: false,
    metadata: { test: true },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockReturnValue(mockToken),
      save: jest.fn().mockResolvedValue(mockToken),
      find: jest.fn().mockResolvedValue([mockToken]),
      findOne: jest.fn().mockResolvedValue(mockToken),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
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
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create and save a token", async () => {
      const createData = {
        mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        name: "USD Coin",
      };

      const result = await service.create(createData);

      expect(mockRepository.create).toHaveBeenCalledWith(createData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockToken);
    });
  });

  describe("findAll", () => {
    it("should return all tokens", async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockToken]);
    });
  });

  describe("findOne", () => {
    it("should return token by id", async () => {
      const result = await service.findOne("test-id");

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("findByMint", () => {
    it("should return token by mint address", async () => {
      const result = await service.findByMint(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("update", () => {
    it("should update token and return updated token", async () => {
      const updateData = { name: "Updated Token" };

      const result = await service.update("test-id", updateData);

      expect(mockRepository.update).toHaveBeenCalledWith("test-id", updateData);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("remove", () => {
    it("should delete token", async () => {
      await service.remove("test-id");

      expect(mockRepository.delete).toHaveBeenCalledWith("test-id");
    });
  });

  describe("getTokenInfo", () => {
    it("should get token info from blockchain", async () => {
      const mockAccountInfo = {
        data: Buffer.alloc(82), // Mock mint data
      };
      // Set up mock data
      mockAccountInfo.data.writeUInt32LE(1000000, 36); // supply
      mockAccountInfo.data.writeUInt8(6, 44); // decimals

      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
      };
      (service as any).connection = mockConnection;

      const result = await service.getTokenInfo(
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );

      expect(mockConnection.getAccountInfo).toHaveBeenCalled();
      expect(result).toHaveProperty(
        "mintAddress",
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      );
      expect(result).toHaveProperty("supply");
      expect(result).toHaveProperty("decimals");
    });

    it("should handle token not found", async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(null),
      };
      (service as any).connection = mockConnection;

      await expect(service.getTokenInfo("invalid-mint")).rejects.toThrow(
        "Failed to get token info: Token mint not found",
      );
    });

    it("should handle errors", async () => {
      const mockConnection = {
        getAccountInfo: jest
          .fn()
          .mockRejectedValue(new Error("Connection failed")),
      };
      (service as any).connection = mockConnection;

      await expect(service.getTokenInfo("invalid-mint")).rejects.toThrow(
        "Failed to get token info: Connection failed",
      );
    });
  });

  describe("getTokenBalance", () => {
    it("should get token balance for owner", async () => {
      const {
        getAssociatedTokenAddress,
        getAccount,
      } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("associated-token-address");
      getAccount.mockResolvedValue({ amount: BigInt(1000000) });

      const result = await service.getTokenBalance(
        "owner-address",
        "mint-address",
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(getAccount).toHaveBeenCalledWith(
        (service as any).connection,
        "associated-token-address",
      );
      expect(result).toBe("1000000");
    });

    it("should handle errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("Invalid address"));

      await expect(
        service.getTokenBalance("invalid-owner", "invalid-mint"),
      ).rejects.toThrow("Failed to get token balance: Invalid address");
    });
  });

  describe("getTokenAccounts", () => {
    it("should get all token accounts for owner", async () => {
      const mockTokenAccounts = {
        value: [
          {
            account: {
              owner: { toString: () => "owner-address" },
              data: Buffer.alloc(165), // Mock token account data
            },
          },
        ],
      };

      // Set up mock data
      mockTokenAccounts.value[0].account.data.writeBigUInt64LE(
        BigInt(500000),
        64,
      ); // amount

      const mockConnection = {
        getTokenAccountsByOwner: jest.fn().mockResolvedValue(mockTokenAccounts),
      };
      (service as any).connection = mockConnection;

      const result = await service.getTokenAccounts("owner-address");

      expect(mockConnection.getTokenAccountsByOwner).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("amount", "500000");
    });

    it("should handle errors", async () => {
      const mockConnection = {
        getTokenAccountsByOwner: jest
          .fn()
          .mockRejectedValue(new Error("Connection failed")),
      };
      (service as any).connection = mockConnection;

      await expect(service.getTokenAccounts("invalid-owner")).rejects.toThrow(
        "Failed to get token accounts: Connection failed",
      );
    });
  });
});
