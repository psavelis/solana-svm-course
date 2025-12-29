import { Test, TestingModule } from "@nestjs/testing";
import { FeeService, FeeEstimate, FeeRecommendation } from "../fee.service";
import { Transaction, SystemProgram, PublicKey } from "@solana/web3.js";

// Mock the Solana connection
const mockConnection = {
  getRecentBlockhash: jest.fn().mockResolvedValue({
    blockhash: "mock-blockhash",
    feeCalculator: { lamportsPerSignature: 5000 },
  }),
  getConfirmedBlock: jest.fn().mockResolvedValue({
    transactions: [
      {
        meta: {
          fee: 10000,
          computeUnitsConsumed: 5000,
        },
      },
    ],
  }),
  getRecentPerformanceSamples: jest.fn().mockResolvedValue([
    { numTransactions: 1000, samplePeriodSecs: 60 },
    { numTransactions: 1500, samplePeriodSecs: 60 },
  ]),
  getSlot: jest.fn().mockResolvedValue(200),
};

jest.mock("@solana/web3.js", () => ({
  Connection: jest.fn().mockImplementation(() => mockConnection),
  Transaction: jest.fn().mockImplementation(() => ({
    instructions: [],
    feePayer: null,
  })),
  SystemProgram: {
    programId: "11111111111111111111111111111112",
  },
  PublicKey: jest.fn().mockImplementation((key) => key),
}));

describe("FeeService", () => {
  let service: FeeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeeService],
    }).compile();

    service = module.get<FeeService>(FeeService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getFeeEstimate", () => {
    it("should return a basic fee estimate", async () => {
      const result = await service.getFeeEstimate();

      expect(result).toHaveProperty("baseFee", 5000);
      expect(result).toHaveProperty("priorityFee");
      expect(result).toHaveProperty("totalFee");
      expect(result).toHaveProperty("computeUnits", 5000);
      expect(result).toHaveProperty("feePayer", "");
    });

    it("should estimate compute units for a transfer transaction", async () => {
      const mockTransaction = {
        instructions: [
          {
            programId: { equals: jest.fn().mockReturnValue(true) }, // Mock SystemProgram
            data: Buffer.from([2, 0, 0, 0]), // Transfer instruction
            accounts: [],
          },
        ],
        feePayer: "11111111111111111111111111111112",
      };

      const result = await service.getFeeEstimate(mockTransaction as any);

      expect(result.computeUnits).toBe(5000); // Transfer estimate
      expect(result.feePayer).toBe("11111111111111111111111111111112");
    });
  });

  describe("getFeeRecommendations", () => {
    it("should return in-depth fee recommendations", async () => {
      const result = await service.getFeeRecommendations();

      expect(result).toHaveProperty("conservative");
      expect(result).toHaveProperty("moderate");
      expect(result).toHaveProperty("aggressive");
      expect(result).toHaveProperty("networkCongestion");
      expect(result).toHaveProperty("recentBlockhash", "mock-blockhash");

      // Check that each recommendation has the required properties
      ["conservative", "moderate", "aggressive"].forEach((level) => {
        expect(result[level]).toHaveProperty("baseFee", 5000);
        expect(result[level]).toHaveProperty("priorityFee");
        expect(result[level]).toHaveProperty("totalFee");
        expect(result[level]).toHaveProperty("computeUnits", 5000);
      });
    });

    it("should handle different priority levels", async () => {
      const result = await service.getFeeRecommendations(undefined, {
        priorityLevel: "high",
      });

      expect(result.moderate.priorityFee).toBeGreaterThan(
        result.conservative.priorityFee,
      );
      expect(result.aggressive.priorityFee).toBeGreaterThan(
        result.moderate.priorityFee,
      );
    });
  });

  describe("validateFeeEstimate", () => {
    it("should validate a reasonable fee estimate", () => {
      const validEstimate: FeeEstimate = {
        baseFee: 5000,
        priorityFee: 1000,
        totalFee: 6000,
        computeUnits: 5000,
        feePayer: "test-payer",
      };

      const result = service.validateFeeEstimate(validEstimate);
      expect(result).toBe(true);
    });

    it("should reject negative fees", () => {
      const invalidEstimate: FeeEstimate = {
        baseFee: -1000,
        priorityFee: 1000,
        totalFee: 0,
        computeUnits: 5000,
        feePayer: "test-payer",
      };

      const result = service.validateFeeEstimate(invalidEstimate);
      expect(result).toBe(false);
    });

    it("should reject excessive fees", () => {
      const invalidEstimate: FeeEstimate = {
        baseFee: 5000,
        priorityFee: 100000000, // 0.1 SOL
        totalFee: 100005000,
        computeUnits: 5000,
        feePayer: "test-payer",
      };

      const result = service.validateFeeEstimate(invalidEstimate);
      expect(result).toBe(false);
    });

    it("should reject invalid compute units", () => {
      const invalidEstimate: FeeEstimate = {
        baseFee: 5000,
        priorityFee: 1000,
        totalFee: 6000,
        computeUnits: 2000000, // Exceeds max compute units
        feePayer: "test-payer",
      };

      const result = service.validateFeeEstimate(invalidEstimate);
      expect(result).toBe(false);
    });
  });

  describe("getFeeMarketStats", () => {
    it("should return fee market statistics", async () => {
      const result = await service.getFeeMarketStats();

      expect(result).toHaveProperty("averageFee");
      expect(result).toHaveProperty("medianFee");
      expect(result).toHaveProperty("percentile95");
      expect(result).toHaveProperty("networkLoad");
      expect(result).toHaveProperty("recommendedBaseFee", 5000);
    });
  });

  describe("estimateComputeUnits", () => {
    it("should estimate compute units for different instruction types", () => {
      // Test with transfer instruction
      const transferTx = {
        instructions: [
          {
            programId: { equals: jest.fn().mockReturnValue(true) }, // System program
            data: Buffer.from([2, 0, 0, 0]), // Transfer
            accounts: [],
          },
        ],
      };

      // Access private method for testing
      const estimateMethod = (service as any).estimateComputeUnits.bind(
        service,
      );
      const transferUnits = estimateMethod(transferTx);
      expect(transferUnits).toBe(5000);

      // Test with create account instruction
      const createAccountTx = {
        instructions: [
          {
            programId: { equals: jest.fn().mockReturnValue(true) }, // System program
            data: Buffer.from([0, 0, 0, 0]), // Create account
            accounts: [],
          },
        ],
      };

      const createUnits = estimateMethod(createAccountTx);
      expect(createUnits).toBe(10000);

      // Test with empty transaction
      const emptyUnits = estimateMethod();
      expect(emptyUnits).toBe(5000);
    });
  });

  describe("Network congestion detection", () => {
    it("should detect network congestion levels", async () => {
      // Test the private method
      const congestionMethod = (service as any).getNetworkCongestion.bind(
        service,
      );
      const congestion = await congestionMethod();

      expect(["low", "medium", "high"]).toContain(congestion);
    });
  });
});
