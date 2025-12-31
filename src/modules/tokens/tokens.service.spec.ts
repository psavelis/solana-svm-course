import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TokensService } from "./tokens.service";
import { Token } from "./token.entity";
import { NFTListing, ListingStatus, ListingType } from "./nft-listing.entity";
import { NFTBid, BidStatus } from "./nft-bid.entity";
import { NFTSale } from "./nft-sale.entity";
import { PublicKey } from "@solana/web3.js";
import { QueryCacheService } from "../../common/cache/query-cache.service";

// Mock Solana web3.js and spl-token
jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => ({
    getAccountInfo: jest.fn(),
    getTokenAccountsByOwner: jest.fn(),
    sendAndConfirmTransaction: jest.fn(),
  })),
  PublicKey: Object.assign(
    jest.fn().mockImplementation((address) => ({
      toString: () => address,
      toBase58: () => address,
      toBuffer: () => Buffer.from(address, 'utf8'),
      equals: jest.fn(),
    })),
    {
      findProgramAddress: jest.fn().mockResolvedValue(["metadata-address", 255]),
    }
  ),
  Keypair: {
    generate: jest.fn().mockReturnValue({
      publicKey: { toString: () => "generated-public-key" },
      secretKey: new Uint8Array(64),
    }),
    fromSecretKey: jest.fn().mockReturnValue({
      publicKey: { toString: () => "keypair-public-key" },
      secretKey: new Uint8Array(64),
    }),
  },
  SystemProgram: {
    createAccount: jest.fn(),
  },
  Transaction: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockReturnThis(),
    sign: jest.fn(),
  })),
  sendAndConfirmTransaction: jest.fn(),
  clusterApiUrl: jest.fn(),
}));

jest.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  getAssociatedTokenAddress: jest.fn(),
  getAccount: jest.fn(),
  createMint: jest.fn(),
  createAssociatedTokenAccount: jest.fn(),
  mintTo: jest.fn(),
  burn: jest.fn(),
  getOrCreateAssociatedTokenAccount: jest.fn(),
  closeAccount: jest.fn(),
  freezeAccount: jest.fn(),
  thawAccount: jest.fn(),
  approve: jest.fn(),
  revoke: jest.fn(),
  createTransferInstruction: jest.fn(),
}));

describe("TokensService", () => {
  let service: TokensService;
  let mockTokenRepository: Partial<Repository<Token>>;
  let mockNFTListingRepository: Partial<Repository<NFTListing>>;
  let mockNFTBidRepository: Partial<Repository<NFTBid>>;
  let mockNFTSaleRepository: Partial<Repository<NFTSale>>;

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

  const mockNFTListing: NFTListing = {
    id: "listing-id",
    nftMintAddress: "nft-mint-address",
    sellerAddress: "seller-address",
    listingType: ListingType.FIXED_PRICE,
    price: 1000000,
    currencyMint: null,
    status: ListingStatus.ACTIVE,
    royaltyPercentage: 5,
    royaltyRecipient: "royalty-recipient",
    auctionEndTime: null,
    marketplaceFee: 2.0,
    bids: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNFTBid: NFTBid = {
    id: "bid-id",
    listingId: "listing-id",
    listing: mockNFTListing,
    bidderAddress: "bidder-address",
    amount: 1000000,
    currencyMint: null,
    status: BidStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockNFTSale: NFTSale = {
    id: "sale-id",
    nftMintAddress: "nft-mint-address",
    sellerAddress: "seller-address",
    buyerAddress: "buyer-address",
    price: 1000000,
    currencyMint: null,
    royaltyAmount: 50000,
    marketplaceFee: 10000,
    transactionSignature: "tx-signature",
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockTokenRepository = {
      create: jest.fn().mockReturnValue(mockToken),
      save: jest.fn().mockResolvedValue(mockToken),
      find: jest.fn().mockResolvedValue([mockToken]),
      findOne: jest.fn().mockResolvedValue(mockToken),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockNFTListingRepository = {
      create: jest.fn().mockReturnValue(mockNFTListing),
      save: jest.fn().mockResolvedValue(mockNFTListing),
      findOne: jest.fn().mockResolvedValue(mockNFTListing),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([mockNFTListing]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockNFTListing]),
      }),
    };

    mockNFTBidRepository = {
      create: jest.fn().mockReturnValue(mockNFTBid),
      save: jest.fn().mockResolvedValue(mockNFTBid),
      findOne: jest.fn().mockResolvedValue(mockNFTBid),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn().mockResolvedValue([mockNFTBid]),
    };

    mockNFTSaleRepository = {
      create: jest.fn().mockReturnValue(mockNFTSale),
      save: jest.fn().mockResolvedValue(mockNFTSale),
      find: jest.fn().mockResolvedValue([mockNFTSale]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokensService,
        {
          provide: QueryCacheService,
          useValue: {
            executeWithCache: jest.fn((key, queryFn) => queryFn()),
            invalidatePattern: jest.fn(),
            clearQueryCache: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Token),
          useValue: mockTokenRepository,
        },
        {
          provide: getRepositoryToken(NFTListing),
          useValue: mockNFTListingRepository,
        },
        {
          provide: getRepositoryToken(NFTBid),
          useValue: mockNFTBidRepository,
        },
        {
          provide: getRepositoryToken(NFTSale),
          useValue: mockNFTSaleRepository,
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

      expect(mockTokenRepository.create).toHaveBeenCalledWith(createData);
      expect(mockTokenRepository.save).toHaveBeenCalledWith(mockToken);
      expect(result).toEqual(mockToken);
    });
  });

  describe("findAll", () => {
    it("should return all tokens", async () => {
      const result = await service.findAll();

      expect(mockTokenRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockToken]);
    });
  });

  describe("findOne", () => {
    it("should return token by id", async () => {
      const result = await service.findOne("test-id");

      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
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

      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("update", () => {
    it("should update token and return updated token", async () => {
      const updateData = { name: "Updated Token" };

      const result = await service.update("test-id", updateData);

      expect(mockTokenRepository.update).toHaveBeenCalledWith("test-id", updateData);
      expect(mockTokenRepository.findOne).toHaveBeenCalledWith({
        where: { id: "test-id" },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe("remove", () => {
    it("should delete token", async () => {
      await service.remove("test-id");

      expect(mockTokenRepository.delete).toHaveBeenCalledWith("test-id");
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

  describe("createTokenMint", () => {
    it("should create a new token mint", async () => {
      const { createMint } = require("@solana/spl-token");
      const { sendAndConfirmTransaction } = require("@solana/web3.js");

      createMint.mockResolvedValue(new PublicKey("mint-public-key"));
      sendAndConfirmTransaction.mockResolvedValue("tx-signature");

      const result = await service.createTokenMint(
        "cGF5ZXItcHJpdmF0ZS1rZXk=", // base64 encoded private key
        9,
        "freeze-authority",
      );

      expect(createMint).toHaveBeenCalled();
      expect(result).toHaveProperty("mintAddress");
      expect(result).toHaveProperty("signature");
    });

    it("should handle errors during mint creation", async () => {
      const { createMint } = require("@solana/spl-token");
      createMint.mockRejectedValue(new Error("Mint creation failed"));

      await expect(
        service.createTokenMint("invalid-payer", 9),
      ).rejects.toThrow("Mint creation failed");
    });
  });

  describe("mintTokens", () => {
    it("should mint tokens to an account", async () => {
      const { mintTo, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");

      getOrCreateAssociatedTokenAccount.mockResolvedValue({
        address: "ata-address",
      });
      mintTo.mockResolvedValue("mint-tx-signature");

      const result = await service.mintTokens(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "recipient-address",
        1000000,
      );

      expect(getOrCreateAssociatedTokenAccount).toHaveBeenCalled();
      expect(mintTo).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle minting errors", async () => {
      const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
      getOrCreateAssociatedTokenAccount.mockRejectedValue(new Error("ATA creation failed"));

      await expect(
        service.mintTokens("cGF5ZXItcHJpdmF0ZS1rZXk=", "mint-address", "recipient", 1000000),
      ).rejects.toThrow("ATA creation failed");
    });
  });

  describe("burnTokens", () => {
    it("should burn tokens from an account", async () => {
      const { burn, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      burn.mockResolvedValue("burn-tx-signature");

      const result = await service.burnTokens(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        500000,
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(burn).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle burning errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("ATA lookup failed"));

      await expect(
        service.burnTokens("cGF5ZXItcHJpdmF0ZS1rZXk=", "invalid-mint", 500000),
      ).rejects.toThrow("ATA lookup failed");
    });
  });

  describe("getTokenSupply", () => {
    it("should get token supply information", async () => {
      const mockAccountInfo = {
        data: Buffer.alloc(82),
      };
      mockAccountInfo.data.writeBigUInt64LE(BigInt(1000000000), 36); // supply
      mockAccountInfo.data.writeUInt8(9, 44); // decimals

      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue(mockAccountInfo),
      };
      (service as any).connection = mockConnection;

      const result = await service.getTokenSupply("mint-address");

      expect(mockConnection.getAccountInfo).toHaveBeenCalled();
      expect(result).toHaveProperty("supply", "1000000000");
      expect(result).toHaveProperty("decimals", 9);
    });

    it("should handle supply lookup errors", async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error("Account not found")),
      };
      (service as any).connection = mockConnection;

      await expect(service.getTokenSupply("invalid-mint")).rejects.toThrow(
        "Account not found",
      );
    });
  });

  describe("getOrCreateATA", () => {
    it("should get or create associated token account", async () => {
      const { getOrCreateAssociatedTokenAccount, getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      getAccount.mockRejectedValue(new Error("Account not found")); // ATA doesn't exist
      getOrCreateAssociatedTokenAccount.mockResolvedValue({
        address: "ata-address",
        instruction: "create-instruction",
      });

      const result = await service.getOrCreateATA(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "owner-address",
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(getAccount).toHaveBeenCalled();
      expect(getOrCreateAssociatedTokenAccount).toHaveBeenCalled();
      expect(result).toHaveProperty("ataAddress", "ata-address");
      expect(result).toHaveProperty("created", true);
    });

    it("should handle ATA creation errors", async () => {
      const { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, getAccount } = require("@solana/spl-token");
      
      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      getAccount.mockRejectedValue(new Error("Account not found"));
      getOrCreateAssociatedTokenAccount.mockRejectedValue(new Error("ATA creation failed"));

      await expect(
        service.getOrCreateATA("cGF5ZXItcHJpdmF0ZS1rZXk=", "mint", "owner"),
      ).rejects.toThrow("Failed to get or create ATA: ATA creation failed");
    });
  });

  describe("getATA", () => {
    it("should get associated token account address", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockResolvedValue("ata-address");

      const result = await service.getATA("mint-address", "owner-address");

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(result).toBe("ata-address");
    });

    it("should handle ATA lookup errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("Invalid addresses"));

      await expect(service.getATA("invalid-mint", "invalid-owner")).rejects.toThrow(
        "Invalid addresses",
      );
    });
  });

  describe("closeTokenAccount", () => {
    it("should close a token account", async () => {
      const { closeAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      closeAccount.mockResolvedValue("close-tx-signature");

      const result = await service.closeTokenAccount(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "destination-address",
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(closeAccount).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle account closing errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("ATA lookup failed"));

      await expect(
        service.closeTokenAccount("cGF5ZXItcHJpdmF0ZS1rZXk=", "invalid-mint", "destination"),
      ).rejects.toThrow("ATA lookup failed");
    });
  });

  describe("freezeTokenAccount", () => {
    it("should freeze a token account", async () => {
      const { freezeAccount } = require("@solana/spl-token");

      freezeAccount.mockResolvedValue("freeze-tx-signature");

      const result = await service.freezeTokenAccount(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "account-address",
      );

      expect(freezeAccount).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle freezing errors", async () => {
      const { freezeAccount } = require("@solana/spl-token");
      freezeAccount.mockRejectedValue(new Error("Freeze failed"));

      await expect(
        service.freezeTokenAccount("cGF5ZXItcHJpdmF0ZS1rZXk=", "mint", "account"),
      ).rejects.toThrow("Failed to freeze token account: Freeze failed");
    });
  });

  describe("thawTokenAccount", () => {
    it("should thaw a token account", async () => {
      const { thawAccount } = require("@solana/spl-token");

      thawAccount.mockResolvedValue("thaw-tx-signature");

      const result = await service.thawTokenAccount(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "account-address",
      );

      expect(thawAccount).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle thawing errors", async () => {
      const { thawAccount } = require("@solana/spl-token");
      thawAccount.mockRejectedValue(new Error("Thaw failed"));

      await expect(
        service.thawTokenAccount("cGF5ZXItcHJpdmF0ZS1rZXk=", "mint", "account"),
      ).rejects.toThrow("Failed to thaw token account: Thaw failed");
    });
  });

  describe("delegateTokenAccount", () => {
    it("should delegate a token account", async () => {
      const { approve, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      approve.mockResolvedValue("approve-tx-signature");

      const result = await service.delegateTokenAccount(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "mint-address",
        "delegate-address",
        1000000,
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(approve).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle delegation errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("ATA lookup failed"));

      await expect(
        service.delegateTokenAccount("cGF5ZXItcHJpdmF0ZS1rZXk=", "invalid-mint", "delegate", 1000000),
      ).rejects.toThrow("Failed to delegate token account: ATA lookup failed");
    });
  });

  describe("createNFTWithMetadata", () => {
    it("should create NFT with metadata", async () => {
      const { createMint, getOrCreateAssociatedTokenAccount, mintTo } = require("@solana/spl-token");

      createMint.mockResolvedValue({
        toString: () => "nft-mint-publickey",
        toBase58: () => "nft-mint-publickey",
        toBuffer: () => Buffer.from("nft-mint-publickey", 'utf8'),
      });
      getOrCreateAssociatedTokenAccount.mockResolvedValue({
        address: "token-account-address",
      });
      mintTo.mockResolvedValue("mint-signature");

      const result = await service.createNFTWithMetadata(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "Test NFT",
        "TNFT",
        "https://example.com/metadata.json",
      );

      expect(createMint).toHaveBeenCalled();
      expect(getOrCreateAssociatedTokenAccount).toHaveBeenCalled();
      expect(mintTo).toHaveBeenCalled();
      expect(result).toHaveProperty("mintAddress");
      expect(result).toHaveProperty("metadataAddress");
      expect(result).toHaveProperty("signature");
    });

    it("should handle NFT creation errors", async () => {
      const { createMint } = require("@solana/spl-token");
      createMint.mockRejectedValue(new Error("NFT creation failed"));

      await expect(
        service.createNFTWithMetadata("payer", "Test", "TNFT", "uri"),
      ).rejects.toThrow("NFT creation failed");
    });
  });

  describe("transferNFT", () => {
    it("should transfer NFT to new owner", async () => {
      const { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, createTransferInstruction } = require("@solana/spl-token");
      const { sendAndConfirmTransaction } = require("@solana/web3.js");

      getAssociatedTokenAddress.mockResolvedValue("from-ata-address");
      getOrCreateAssociatedTokenAccount.mockResolvedValue({
        address: "to-ata-address",
      });
      createTransferInstruction.mockReturnValue("transfer-instruction");
      sendAndConfirmTransaction.mockResolvedValue("transfer-signature");

      const result = await service.transferNFT(
        "cGF5ZXItcHJpdmF0ZS1rZXk=",
        "nft-mint-address",
        "new-owner-address",
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(getOrCreateAssociatedTokenAccount).toHaveBeenCalled();
      expect(createTransferInstruction).toHaveBeenCalled();
      expect(sendAndConfirmTransaction).toHaveBeenCalled();
      expect(result).toHaveProperty("signature");
    });

    it("should handle NFT transfer errors", async () => {
      const { getAssociatedTokenAddress } = require("@solana/spl-token");
      getAssociatedTokenAddress.mockRejectedValue(new Error("ATA lookup failed"));

      await expect(
        service.transferNFT("cGF5ZXItcHJpdmF0ZS1rZXk=", "invalid-mint", "new-owner"),
      ).rejects.toThrow("Failed to transfer NFT: ATA lookup failed");
    });
  });

  describe("verifyNFTOwnership", () => {
    it("should verify NFT ownership", async () => {
      const { getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      getAccount.mockResolvedValue({
        amount: BigInt(1),
      });

      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: (() => {
            const buffer = Buffer.alloc(45, 0);
            // Set supply to 1 (BigInt(1) in little-endian)
            buffer.writeBigUInt64LE(BigInt(1), 36);
            // Set decimals to 0
            buffer[44] = 0;
            return buffer;
          })(),
        }),
      };
      (service as any).connection = mockConnection;

      const result = await service.verifyNFTOwnership(
        "nft-mint-address",
        "owner-address",
      );

      expect(getAssociatedTokenAddress).toHaveBeenCalled();
      expect(getAccount).toHaveBeenCalled();
      expect(result.isOwner).toBe(true);
      expect(result.balance).toBe("1");
      expect(result.isNFT).toBe(true);
    });

    it("should return false for non-owned NFT", async () => {
      const { getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      getAccount.mockResolvedValue({
        amount: BigInt(0),
      });

      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: Buffer.alloc(45, 0), // Mock mint data with supply=1, decimals=0
        }),
      };
      (service as any).connection = mockConnection;

      const result = await service.verifyNFTOwnership(
        "nft-mint-address",
        "owner-address",
      );

      expect(result.isOwner).toBe(false);
      expect(result.balance).toBe("0");
    });

    it("should handle ownership verification errors", async () => {
      const mockConnection = {
        getAccountInfo: jest.fn().mockRejectedValue(new Error("Token mint not found")),
      };
      (service as any).connection = mockConnection;

      await expect(
        service.verifyNFTOwnership("nft-mint", "owner"),
      ).rejects.toThrow("Failed to verify NFT ownership: Token mint not found");
    });
  });

  describe("createNFTListing", () => {
    it("should create NFT listing", async () => {
      const { getAccount, getAssociatedTokenAddress } = require("@solana/spl-token");

      getAssociatedTokenAddress.mockResolvedValue("ata-address");
      getAccount.mockResolvedValue({
        amount: BigInt(1),
        owner: { toString: () => "seller-address" },
      });

      const mockConnection = {
        getAccountInfo: jest.fn().mockResolvedValue({
          data: Buffer.alloc(45, 0), // Mock mint data with supply=1, decimals=0
        }),
      };
      (service as any).connection = mockConnection;

      const listingData = {
        nftMintAddress: "nft-mint-address",
        sellerAddress: "seller-address",
        price: 1000000,
        listingType: ListingType.FIXED_PRICE,
      };

      const result = await service.createNFTListing(listingData);

      expect(mockNFTListingRepository.create).toHaveBeenCalledWith({
        ...listingData,
        status: ListingStatus.ACTIVE,
        royaltyPercentage: 0,
      });
      expect(mockNFTListingRepository.save).toHaveBeenCalledWith(mockNFTListing);
      expect(result).toEqual(mockNFTListing);
    });
  });

  describe("placeBid", () => {
    it("should place bid on NFT listing", async () => {
      const bidData = {
        listingId: "listing-id",
        bidderAddress: "bidder-address",
        amount: 1000000,
      };

      const result = await service.placeBid(bidData);

      expect(mockNFTBidRepository.create).toHaveBeenCalledWith({
        ...bidData,
        status: BidStatus.ACTIVE,
      });
      expect(mockNFTBidRepository.save).toHaveBeenCalledWith(mockNFTBid);
      expect(result).toEqual(mockNFTBid);
    });
  });

  describe("acceptBid", () => {
    it("should accept bid and create sale", async () => {
      const mockListing = { ...mockNFTListing, status: ListingStatus.ACTIVE };
      const mockBid = { ...mockNFTBid, status: BidStatus.ACTIVE };

      mockNFTListingRepository.findOne = jest.fn().mockResolvedValue(mockListing);
      mockNFTBidRepository.findOne = jest.fn().mockResolvedValue(mockBid);

      const result = await service.acceptBid("listing-id", "bid-id");

      expect(mockNFTListingRepository.findOne).toHaveBeenCalled();
      expect(mockNFTBidRepository.findOne).toHaveBeenCalled();
      expect(mockNFTBidRepository.update).toHaveBeenCalledWith("bid-id", {
        status: BidStatus.ACCEPTED,
      });
      expect(mockNFTListingRepository.update).toHaveBeenCalledWith("listing-id", {
        status: ListingStatus.SOLD,
      });
      expect(mockNFTSaleRepository.create).toHaveBeenCalled();
      expect(mockNFTSaleRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockNFTSale);
    });
  });

  describe("cancelListing", () => {
    it("should cancel NFT listing", async () => {
      const mockListing = { ...mockNFTListing, status: ListingStatus.ACTIVE, sellerAddress: "seller-address" };
      mockNFTListingRepository.findOne = jest.fn().mockResolvedValue(mockListing);

      await service.cancelListing("listing-id", "seller-address");

      expect(mockNFTListingRepository.findOne).toHaveBeenCalled();
      expect(mockNFTListingRepository.update).toHaveBeenCalledWith("listing-id", {
        status: ListingStatus.CANCELLED,
      });
      expect(mockNFTBidRepository.update).toHaveBeenCalled();
    });

    it("should throw error for non-owned listing", async () => {
      mockNFTListingRepository.findOne = jest.fn().mockResolvedValue(null);

      await expect(
        service.cancelListing("listing-id", "seller-address"),
      ).rejects.toThrow("Listing not found or not owned by seller");
    });
  });

  describe("getActiveListings", () => {
    it("should get active listings with filters", async () => {
      const filters = {
        sellerAddress: "seller-address",
        minPrice: 500000,
        maxPrice: 2000000,
        listingType: ListingType.FIXED_PRICE,
      };

      const result = await service.getActiveListings(filters);

      expect(mockNFTListingRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual([mockNFTListing]);
    });

    it("should get all active listings without filters", async () => {
      const result = await service.getActiveListings();

      expect(mockNFTListingRepository.createQueryBuilder).toHaveBeenCalled();
      expect(result).toEqual([mockNFTListing]);
    });
  });

  describe("getListingBids", () => {
    it("should get all bids for a listing", async () => {
      const result = await service.getListingBids("listing-id");

      expect(mockNFTBidRepository.find).toHaveBeenCalledWith({
        where: { listingId: "listing-id" },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual([mockNFTBid]);
    });
  });

  describe("getNFTSalesHistory", () => {
    it("should get NFT sales history", async () => {
      const result = await service.getNFTSalesHistory("nft-mint-address");

      expect(mockNFTSaleRepository.find).toHaveBeenCalledWith({
        where: { nftMintAddress: "nft-mint-address" },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual([mockNFTSale]);
    });
  });
});
