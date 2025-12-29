import { Test, TestingModule } from "@nestjs/testing";
import { getConnectionToken } from "@nestjs/typeorm";
import { Connection } from "typeorm";
import { DatabasePerformanceService } from "../database-performance.service";
import { DatabaseConnectionService } from "../database-connection.service";

describe("DatabasePerformanceService", () => {
  let service: DatabasePerformanceService;
  let mockConnection: Partial<Connection>;
  let mockDbConnection: Partial<DatabaseConnectionService>;

  beforeEach(async () => {
    mockConnection = {
      name: "test-connection",
      options: {} as any,
      isConnected: true,
    };

    mockDbConnection = {
      executeQuery: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabasePerformanceService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: DatabaseConnectionService,
          useValue: mockDbConnection,
        },
      ],
    }).compile();

    service = module.get<DatabasePerformanceService>(
      DatabasePerformanceService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getPerformanceReport", () => {
    it("should return a in-depth performance report", async () => {
      // Mock the database queries
      mockDbConnection.executeQuery = jest
        .fn()
        .mockResolvedValueOnce([]) // index stats
        .mockResolvedValueOnce([]) // table stats
        .mockResolvedValueOnce([]); // slow queries

      const report = await service.getPerformanceReport();

      expect(report).toHaveProperty("indexStats");
      expect(report).toHaveProperty("slowQueries");
      expect(report).toHaveProperty("tableStats");
      expect(report).toHaveProperty("recommendations");
      expect(report).toHaveProperty("generatedAt");
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockDbConnection.executeQuery = jest
        .fn()
        .mockRejectedValue(new Error("DB Error"));

      const report = await service.getPerformanceReport();

      expect(report.indexStats).toEqual([]);
      expect(report.tableStats).toEqual([]);
      expect(report.slowQueries).toEqual([]);
    });
  });

  describe("getIndexUsageStats", () => {
    it("should return index usage statistics", async () => {
      const mockIndexData = [
        {
          indexname: "idx_test",
          tablename: "test_table",
          usage_count: "100",
          index_size: "1 MB",
          idx_tup_read: "1000",
          idx_tup_fetch: "500",
        },
      ];

      mockDbConnection.executeQuery = jest
        .fn()
        .mockResolvedValue(mockIndexData);

      const stats = await service.getIndexUsageStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        indexName: "idx_test",
        tableName: "test_table",
        usageCount: 100,
        isUsed: true,
      });
    });

    it("should handle query errors", async () => {
      mockDbConnection.executeQuery = jest
        .fn()
        .mockRejectedValue(new Error("Query failed"));

      const stats = await service.getIndexUsageStats();
      expect(stats).toEqual([]);
    });
  });

  describe("getTableStats", () => {
    it("should return table statistics", async () => {
      const mockTableData = [
        {
          tablename: "test_table",
          live_rows: "1000",
          table_size: "10 MB",
          index_size: "2 MB",
        },
      ];

      mockDbConnection.executeQuery = jest
        .fn()
        .mockResolvedValue(mockTableData);

      const stats = await service.getTableStats();

      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        tableName: "test_table",
        rowCount: 1000,
      });
    });
  });

  describe("analyzeQuery", () => {
    it("should analyze query performance", async () => {
      const mockResult = [{ id: 1, name: "test" }];
      mockDbConnection.executeQuery = jest.fn().mockResolvedValue(mockResult);

      const result = await service.analyzeQuery("SELECT * FROM test");

      expect(result).toMatchObject({
        query: "SELECT * FROM test",
        rowsAffected: 1,
      });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should handle query errors", async () => {
      mockDbConnection.executeQuery = jest
        .fn()
        .mockRejectedValue(new Error("Query failed"));

      const result = await service.analyzeQuery("SELECT * FROM invalid_table");

      expect(result).toMatchObject({
        query: "SELECT * FROM invalid_table",
        rowsAffected: 0,
      });
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generateRecommendations", () => {
    it("should generate recommendations for unused indexes", () => {
      const report = {
        indexStats: [
          {
            indexName: "unused_idx",
            tableName: "test",
            columnNames: [],
            indexSize: 1000,
            usageCount: 0,
            lastUsed: null,
            isUsed: false,
          },
        ],
        slowQueries: [],
        tableStats: [],
        recommendations: [],
        generatedAt: new Date(),
      };

      const recommendations = service.generateRecommendations(report);

      expect(
        recommendations.some((rec) => rec.includes("unused indexes")),
      ).toBe(true);
    });

    it("should generate recommendations for large tables", () => {
      const report = {
        indexStats: [],
        slowQueries: [],
        tableStats: [
          {
            tableName: "large_table",
            rowCount: 1000000,
            tableSize: 200 * 1024 * 1024,
            indexSize: 50 * 1024 * 1024,
          }, // 200MB
        ],
        recommendations: [],
        generatedAt: new Date(),
      };

      const recommendations = service.generateRecommendations(report);

      expect(recommendations.some((rec) => rec.includes("partitioning"))).toBe(
        true,
      );
    });

    it("should always include general recommendations", () => {
      const report = {
        indexStats: [],
        slowQueries: [],
        tableStats: [],
        recommendations: [],
        generatedAt: new Date(),
      };

      const recommendations = service.generateRecommendations(report);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((rec) => rec.includes("ANALYZE"))).toBe(true);
    });
  });

  describe("getConfigurationRecommendations", () => {
    it("should return configuration recommendations", () => {
      const recommendations = service.getConfigurationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((rec) => rec.includes("work_mem"))).toBe(
        true,
      );
    });
  });

  describe("getIndexRecommendations", () => {
    it("should return index recommendations", () => {
      const recommendations = service.getIndexRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(
        recommendations.some((rec) => rec.includes("composite indexes")),
      ).toBe(true);
    });
  });
});
