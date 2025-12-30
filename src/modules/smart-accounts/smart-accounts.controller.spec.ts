import { Test, TestingModule } from "@nestjs/testing";
import { SmartAccountsController } from "./smart-accounts.controller";
import { SmartAccountsService } from "./smart-accounts.service";

describe("SmartAccountsController", () => {
  let controller: SmartAccountsController;
  let serviceMock: any;

  beforeEach(async () => {
    serviceMock = {
      createSmartAccount: jest.fn(),
      findByAddress: jest.fn(),
      validateTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SmartAccountsController],
      providers: [
        {
          provide: SmartAccountsService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<SmartAccountsController>(SmartAccountsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create smart account", async () => {
      const body = { ownerAddress: "owner1", rules: {} };
      serviceMock.createSmartAccount.mockResolvedValue({ id: "1", ...body });

      const result = await controller.create(body);
      expect(serviceMock.createSmartAccount).toHaveBeenCalledWith("owner1", {});
      expect(result).toEqual({ id: "1", ...body });
    });

    it("should throw error if ownerAddress missing", async () => {
      await expect(controller.create({} as any)).rejects.toThrow();
    });
  });

  describe("get", () => {
    it("should return account", async () => {
      serviceMock.findByAddress.mockResolvedValue({ id: "1" });
      const result = await controller.get("addr1");
      expect(serviceMock.findByAddress).toHaveBeenCalledWith("addr1");
      expect(result).toEqual({ id: "1" });
    });
  });

  describe("validate", () => {
    it("should validate transaction", async () => {
      serviceMock.validateTransaction.mockResolvedValue({ valid: true });
      const result = await controller.validate("addr1", {
        amount: 100,
        programId: "prog1",
      });
      expect(serviceMock.validateTransaction).toHaveBeenCalledWith(
        "addr1",
        100,
        "prog1",
      );
      expect(result).toEqual({ valid: true });
    });
  });
});
