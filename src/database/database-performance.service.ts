import { Injectable, Logger } from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection } from "typeorm";
import { DatabaseConnectionService } from "./database-connection.service";

export interface IndexUsageStats {
  indexName: string;
  tableName: string;
  columnNames: string[];
  indexSize: number;
  usageCount: number;
  lastUsed: Date | null;
  isUsed: boolean;
}

export interface QueryPerformanceStats {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: Date;
}

export interface DatabasePerformanceReport {
  indexStats: IndexUsageStats[];
  slowQueries: QueryPerformanceStats[];
  tableStats: {
    tableName: string;
    rowCount: number;
    tableSize: number;
    indexSize: number;
  }[];
  recommendations: string[];
  generatedAt: Date;
}

@Injectable()
export class DatabasePerformanceService {
  private readonly logger = new Logger(DatabasePerformanceService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    private readonly dbConnection: DatabaseConnectionService,
  ) {}

  /**
   * Get in-depth database performance report
   */
  async getPerformanceReport(): Promise<DatabasePerformanceReport> {
    const report: DatabasePerformanceReport = {
      indexStats: [],
      slowQueries: [],
      tableStats: [],
      recommendations: [],
      generatedAt: new Date(),
    };

    try {
      // Get index usage statistics
      report.indexStats = await this.getIndexUsageStats();

      // Get table statistics
      report.tableStats = await this.getTableStats();

      // Get slow query analysis (if available)
      report.slowQueries = await this.getSlowQueries();

      // Generate optimization recommendations
      report.recommendations = this.generateRecommendations(report);
    } catch (error) {
      this.logger.error("Failed to generate performance report", error);
    }

    return report;
  }

  /**
   * Get index usage statistics
   */
  async getIndexUsageStats(): Promise<IndexUsageStats[]> {
    try {
      const query = `
        SELECT
          schemaname,
          tablename,
          indexname,
          idx_scan as usage_count,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
          idx_tup_read,
          idx_tup_fetch
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC, tablename, indexname;
      `;

      const results = await this.dbConnection.executeQuery(query);

      return results.map((row: any) => ({
        indexName: row.indexname,
        tableName: row.tablename,
        columnNames: [], // Would need additional query to get column names
        indexSize: this.parseSize(row.index_size),
        usageCount: parseInt(row.usage_count) || 0,
        lastUsed: null, // PostgreSQL doesn't track last used time easily
        isUsed: parseInt(row.usage_count) > 0,
      }));
    } catch (error) {
      this.logger.error("Failed to get index usage stats", error);
      return [];
    }
  }

  /**
   * Get table statistics
   */
  async getTableStats(): Promise<DatabasePerformanceReport["tableStats"]> {
    try {
      const query = `
        SELECT
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
      `;

      const results = await this.dbConnection.executeQuery(query);

      return results.map((row: any) => ({
        tableName: row.tablename,
        rowCount: parseInt(row.live_rows) || 0,
        tableSize: this.parseSize(row.table_size),
        indexSize: this.parseSize(row.index_size),
      }));
    } catch (error) {
      this.logger.error("Failed to get table stats", error);
      return [];
    }
  }

  /**
   * Get slow query analysis (simplified version)
   */
  async getSlowQueries(): Promise<QueryPerformanceStats[]> {
    // In a real implementation, this would analyze query logs
    // For now, return empty array as we don't have query logging enabled
    return [];
  }

  /**
   * Generate optimization recommendations based on performance data
   */
  generateRecommendations(report: DatabasePerformanceReport): string[] {
    const recommendations: string[] = [];

    // Analyze unused indexes
    const unusedIndexes = report.indexStats.filter((idx) => !idx.isUsed);
    if (unusedIndexes.length > 0) {
      recommendations.push(
        `Consider removing ${unusedIndexes.length} unused indexes: ${unusedIndexes.map((idx) => idx.indexName).join(", ")}`,
      );
    }

    // Analyze table sizes
    const largeTables = report.tableStats.filter(
      (table) => table.tableSize > 100 * 1024 * 1024,
    ); // > 100MB
    if (largeTables.length > 0) {
      recommendations.push(
        `Consider partitioning large tables: ${largeTables.map((table) => table.tableName).join(", ")}`,
      );
    }

    // Analyze index to table size ratio
    report.tableStats.forEach((table) => {
      const ratio = table.indexSize / (table.tableSize + table.indexSize);
      if (ratio > 0.5) {
        // Indexes > 50% of total size
        recommendations.push(
          `High index-to-table ratio for ${table.tableName} (${(ratio * 100).toFixed(1)}%). Consider index optimization.`,
        );
      }
    });

    // General recommendations
    if (report.indexStats.length === 0) {
      recommendations.push(
        "Enable pg_stat_statements extension for detailed query analysis",
      );
    }

    recommendations.push(
      "Consider running ANALYZE on tables after bulk operations",
    );
    recommendations.push(
      "Monitor for long-running queries and optimize as needed",
    );

    return recommendations;
  }

  /**
   * Analyze specific query performance
   */
  async analyzeQuery(
    query: string,
    params?: any[],
  ): Promise<QueryPerformanceStats> {
    const startTime = Date.now();

    try {
      const result = await this.dbConnection.executeQuery(query, params);
      const executionTime = Date.now() - startTime;

      return {
        query,
        executionTime,
        rowsAffected: Array.isArray(result) ? result.length : 1,
        timestamp: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Query analysis failed: ${query}`, error);

      return {
        query,
        executionTime,
        rowsAffected: 0,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get database configuration recommendations
   */
  getConfigurationRecommendations(): string[] {
    return [
      "Set work_mem appropriately for your query complexity (16-64MB)",
      "Configure maintenance_work_mem for index creation (256MB+)",
      "Set shared_buffers to 25% of available RAM",
      "Enable autovacuum and monitor its performance",
      "Consider enabling pg_stat_statements for query analysis",
      "Set appropriate checkpoint_segments or use PostgreSQL 9.5+ with automatic tuning",
    ];
  }

  /**
   * Parse PostgreSQL size string (e.g., "123 MB") to bytes
   */
  private parseSize(sizeStr: string): number {
    if (!sizeStr) return 0;

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(bytes?|kB|MB|GB|TB)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
      bytes: 1,
      kb: 1024,
      mb: 1024 * 1024,
      gb: 1024 * 1024 * 1024,
      tb: 1024 * 1024 * 1024 * 1024,
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  /**
   * Get index creation recommendations for common query patterns
   */
  getIndexRecommendations(): string[] {
    return [
      "Create composite indexes for multi-column WHERE clauses",
      "Consider partial indexes for status-based queries",
      "Add indexes on foreign key columns",
      "Use covering indexes for SELECT queries with specific columns",
      "Consider BRIN indexes for time-series data",
      "Monitor index bloat and reindex when necessary",
    ];
  }
}
