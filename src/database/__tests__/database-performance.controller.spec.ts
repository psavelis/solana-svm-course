import { Test, TestingModule } from "@nestjs/testing";
import { DatabasePerformanceController } from "../database-performance.controller";
import { DatabasePerformanceService } from "../database-performance.service";

describe("DatabasePerformanceController", () => {
  let controller: DatabasePerformanceController;
  let mockService: Partial<DatabasePerformanceService>;

  beforeEach(async () => {
    mockService = {
      getPerformanceReport: jest.fn().mockResolvedValue({
        indexStats: [],
        slowQueries: [],
        tableStats: [],
        recommendations: ["Test recommendation"],
        generatedAt: new Date(),
      }),
      getConfigurationRecommendations: jest
        .fn()
        .mockReturnValue(["Config recommendation"]),
      getIndexRecommendations: jest
        .fn()
        .mockReturnValue(["Index recommendation"]),
      analyzeQuery: jest.fn().mockResolvedValue({
        query: "SELECT 1",
        executionTime: 10,
        rowsAffected: 1,
        timestamp: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabasePerformanceController],
      providers: [
        {
          provide: DatabasePerformanceService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<DatabasePerformanceController>(
      DatabasePerformanceController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPerformanceReport", () => {
    it("should return performance report", async () => {
      const result = await controller.getPerformanceReport();

      expect(result).toHaveProperty("indexStats");
      expect(result).toHaveProperty("recommendations");
      expect(mockService.getPerformanceReport).toHaveBeenCalled();
    });
  });

  describe("getConfigurationRecommendations", () => {
    it("should return configuration recommendations", () => {
      const result = controller.getConfigurationRecommendations();

      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("timestamp");
      expect(result.recommendations).toContain("Config recommendation");
      expect(mockService.getConfigurationRecommendations).toHaveBeenCalled();
    });
  });

  describe("getIndexRecommendations", () => {
    it("should return index recommendations", () => {
      const result = controller.getIndexRecommendations();

      expect(result).toHaveProperty("recommendations");
      expect(result).toHaveProperty("timestamp");
      expect(result.recommendations).toContain("Index recommendation");
      expect(mockService.getIndexRecommendations).toHaveBeenCalled();
    });
  });

  describe("analyzeQuery", () => {
    it("should analyze query and return result", async () => {
      const body = { query: "SELECT 1", params: [] };

      const result = await controller.analyzeQuery(body);

      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("timestamp");
      expect(result.analysis.query).toBe("SELECT 1");
      expect(mockService.analyzeQuery).toHaveBeenCalledWith("SELECT 1", []);
    });

    it("should handle query analysis without params", async () => {
      const body = { query: "SELECT * FROM test" };

      const result = await controller.analyzeQuery(body);

      expect(mockService.analyzeQuery).toHaveBeenCalledWith(
        "SELECT * FROM test",
        undefined,
      );
    });
  });
});
