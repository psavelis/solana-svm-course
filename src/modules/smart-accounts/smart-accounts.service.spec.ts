import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { SmartAccountsService } from "./smart-accounts.service";
import { SmartAccount, SmartAccountStatus } from "./smart-account.entity";
import { SessionKey, SessionKeyStatus } from "./session-key.entity";

describe("SmartAccountsService", () => {
  let service: SmartAccountsService;
  let repositoryMock: any;
  let redisMock: any;
  let kafkaMock: any;

  const mockSmartAccount = {
    id: "uuid",
    ownerAddress: "owner123",
    smartAccountAddress: "smart-owner123",
    status: SmartAccountStatus.ACTIVE,
    rules: { maxDailySpend: 1000, allowedPrograms: ["prog1"] },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    repositoryMock = {
      create: jest.fn().mockReturnValue(mockSmartAccount),
      save: jest.fn().mockResolvedValue(mockSmartAccount),
      findOne: jest.fn(),
    };

    redisMock = {
      set: jest.fn().mockResolvedValue("OK"),
      get: jest.fn(),
      incrby: jest.fn().mockResolvedValue(100),
      expire: jest.fn().mockResolvedValue(1),
    };

    kafkaMock = {
      emit: jest.fn(),
    };

    const sessionKeyRepositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartAccountsService,
        {
          provide: getRepositoryToken(SmartAccount),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(SessionKey),
          useValue: sessionKeyRepositoryMock,
        },
        {
          provide: "REDIS_CLIENT",
          useValue: redisMock,
        },
        {
          provide: "KAFKA_SERVICE",
          useValue: kafkaMock,
        },
      ],
    }).compile();

    service = module.get<SmartAccountsService>(SmartAccountsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createSmartAccount", () => {
    it("should create and cache account", async () => {
      const result = await service.createSmartAccount(
        "owner123",
        mockSmartAccount.rules,
      );
      expect(repositoryMock.create).toHaveBeenCalled();
      expect(repositoryMock.save).toHaveBeenCalled();
      expect(redisMock.set).toHaveBeenCalledWith(
        expect.stringContaining(":rules"),
        JSON.stringify(mockSmartAccount.rules),
        "EX",
        3600,
      );
      expect(kafkaMock.emit).toHaveBeenCalledWith(
        "smart-account.created",
        expect.any(Object),
      );
      expect(result).toEqual(mockSmartAccount);
    });
  });

  describe("validateTransaction", () => {
    it("should validate successfully using cached rules", async () => {
      redisMock.get.mockImplementation((key) => {
        if (key.includes(":rules"))
          return Promise.resolve(JSON.stringify(mockSmartAccount.rules));
        if (key.includes(":spent")) return Promise.resolve("500");
        return null;
      });

      const result = await service.validateTransaction(
        "smart-addr",
        100,
        "prog1",
      );
      expect(result.valid).toBe(true);
    });

    it("should fail if daily limit exceeded", async () => {
      redisMock.get.mockImplementation((key) => {
        if (key.includes(":rules"))
          return Promise.resolve(JSON.stringify(mockSmartAccount.rules)); // Limit 1000
        if (key.includes(":spent")) return Promise.resolve("950");
        return null;
      });

      const result = await service.validateTransaction(
        "smart-addr",
        100,
        "prog1",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Daily spend limit exceeded");
    });

    it("should fail if program not allowed", async () => {
      redisMock.get.mockResolvedValueOnce(
        JSON.stringify(mockSmartAccount.rules),
      );

      const result = await service.validateTransaction(
        "smart-addr",
        10,
        "evil-prog",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("Program evil-prog not allowed");
    });

    it("should fetch from DB if cache miss", async () => {
      redisMock.get.mockResolvedValueOnce(null); // Cache miss for rules
      repositoryMock.findOne.mockResolvedValue(mockSmartAccount);

      const result = await service.validateTransaction(
        "smart-addr",
        10,
        "prog1",
      );

      expect(repositoryMock.findOne).toHaveBeenCalledWith({
        where: { smartAccountAddress: "smart-addr" },
      });
      expect(redisMock.set).toHaveBeenCalled(); // Should cache it
      expect(result.valid).toBe(true);
    });

    it("should fail if account not found in DB", async () => {
      redisMock.get.mockResolvedValueOnce(null);
      repositoryMock.findOne.mockResolvedValue(null);

      const result = await service.validateTransaction(
        "smart-addr",
        10,
        "prog1",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Account not found");
    });

    it("should fail if account is not active", async () => {
      redisMock.get.mockResolvedValueOnce(null);
      repositoryMock.findOne.mockResolvedValue({
        ...mockSmartAccount,
        status: SmartAccountStatus.DISABLED,
      });

      const result = await service.validateTransaction(
        "smart-addr",
        10,
        "prog1",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("Account not active");
    });
  });

  describe("recordTransaction", () => {
    it("should increment spend in redis", async () => {
      await service.recordTransaction("smart-addr", 500);
      expect(redisMock.incrby).toHaveBeenCalledWith(
        expect.stringContaining(":spent:"),
        500,
      );
      expect(redisMock.expire).toHaveBeenCalled();
    });
  });

  describe("findByAddress", () => {
    it("should return account", async () => {
      repositoryMock.findOne.mockResolvedValue(mockSmartAccount);
      const result = await service.findByAddress("smart-addr");
      expect(result).toEqual(mockSmartAccount);
    });
  });
});
