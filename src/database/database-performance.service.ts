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

export interface QueryAnalysisResult {
  query: string;
  executionPlan: any;
  executionTime: number;
  recommendations: string[];
  optimizedQuery?: string;
  indexSuggestions: IndexSuggestion[];
}

export interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  impact: 'high' | 'medium' | 'low';
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
   * Get performance metrics (alias for getPerformanceReport)
   */
  async getPerformanceMetrics(): Promise<DatabasePerformanceReport> {
    return this.getPerformanceReport();
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
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<string[]> {
    const report = await this.getPerformanceReport();
    return this.generateRecommendations(report);
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
   * Perform detailed query analysis with EXPLAIN plan
   */
  async analyzeQueryDetailed(
    query: string,
    params?: any[],
  ): Promise<QueryAnalysisResult> {
    const startTime = Date.now();
    const recommendations: string[] = [];
    const indexSuggestions: IndexSuggestion[] = [];

    try {
      // Get execution plan
      const explainQuery = `EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING) ${query}`;
      const planResult = await this.dbConnection.executeQuery(explainQuery, params);
      const executionTime = Date.now() - startTime;

      // Execute actual query to get row count
      const result = await this.dbConnection.executeQuery(query, params);

      // Analyze the execution plan
      const executionPlan = planResult;
      const analysis = this.analyzeExecutionPlan(executionPlan, query);

      recommendations.push(...analysis.recommendations);
      indexSuggestions.push(...analysis.indexSuggestions);

      // Generate additional recommendations
      if (executionTime > 1000) {
        recommendations.push("Query execution time exceeds 1 second - consider optimization");
      }

      if (Array.isArray(result) && result.length > 1000) {
        recommendations.push("Large result set detected - consider pagination");
      }

      return {
        query,
        executionPlan,
        executionTime,
        recommendations,
        indexSuggestions,
        optimizedQuery: this.generateOptimizedQuery(query, analysis),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Detailed query analysis failed: ${query}`, error);

      return {
        query,
        executionPlan: null,
        executionTime,
        recommendations: ["Failed to analyze query - check syntax and permissions"],
        indexSuggestions: [],
      };
    }
  }

  /**
   * Analyze execution plan and generate recommendations
   */
  private analyzeExecutionPlan(plan: any[], query: string): {
    recommendations: string[];
    indexSuggestions: IndexSuggestion[];
  } {
    const recommendations: string[] = [];
    const indexSuggestions: IndexSuggestion[] = [];

    // Convert plan to string for analysis
    const planText = JSON.stringify(plan).toLowerCase();

    // Check for sequential scans
    if (planText.includes('seq scan')) {
      recommendations.push("Sequential scan detected - consider adding indexes");

      // Try to identify table and potential index columns
      const tableMatch = query.match(/from\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        const whereMatch = query.match(/where\s+(.+?)(?:\s+(?:group|order|limit)|$)/i);

        if (whereMatch) {
          const whereClause = whereMatch[1];
          const columns = this.extractColumnsFromWhere(whereClause);

          if (columns.length > 0) {
            indexSuggestions.push({
              table,
              columns,
              type: 'btree',
              reason: 'WHERE clause analysis suggests composite index',
              impact: 'high',
            });
          }
        }
      }
    }

    // Check for nested loops
    if (planText.includes('nested loop')) {
      recommendations.push("Nested loop join detected - consider hash joins for large datasets");
    }

    // Check for sorts without indexes
    if (planText.includes('sort') && !planText.includes('index')) {
      recommendations.push("External sort detected - consider indexed ORDER BY");
    }

    // Check for high cost operations
    const costMatch = planText.match(/cost=(\d+)/);
    if (costMatch && parseInt(costMatch[1]) > 1000) {
      recommendations.push("High query cost detected - optimization recommended");
    }

    return { recommendations, indexSuggestions };
  }

  /**
   * Extract column names from WHERE clause
   */
  private extractColumnsFromWhere(whereClause: string): string[] {
    const columns: string[] = [];
    const columnRegex = /(\w+)\s*[=<>!]+\s*[^=<>!]+/g;
    let match;

    while ((match = columnRegex.exec(whereClause)) !== null) {
      columns.push(match[1]);
    }

    return [...new Set(columns)]; // Remove duplicates
  }

  /**
   * Generate optimized version of query
   */
  private generateOptimizedQuery(originalQuery: string, analysis: any): string | undefined {
    let optimized = originalQuery;

    // Add LIMIT if not present and result set might be large
    if (!originalQuery.toLowerCase().includes('limit') && analysis.recommendations.some((r: string) => r.includes('pagination'))) {
      optimized += ' LIMIT 100';
    }

    // Only return optimized query if it's different
    return optimized !== originalQuery ? optimized : undefined;
  }

  /**
   * Get index creation SQL for suggestions
   */
  generateIndexSQL(suggestion: IndexSuggestion): string {
    const columnsStr = suggestion.columns.join(', ');
    const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`;

    return `CREATE INDEX ${indexName} ON ${suggestion.table} USING ${suggestion.type} (${columnsStr});`;
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

  /**
   * Get database configuration recommendations
   */
  getConfigurationRecommendations(): string[] {
    return [
      "Set work_mem appropriately for your query complexity (16-64MB)",
      "Configure maintenance_work_mem for index creation (256MB+)",
      "Set shared_buffers to 25% of available RAM",
      "Enable autovacuum and monitor its performance",
      "Set effective_cache_size to 75% of available RAM",
      "Configure wal_buffers and checkpoint_segments appropriately",
      "Enable pg_stat_statements for query monitoring",
    ];
  }
}
