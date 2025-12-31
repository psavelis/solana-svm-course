import { Controller, Get, Post, Body, Logger } from "@nestjs/common";
import {
  DatabasePerformanceService,
  DatabasePerformanceReport,
} from "./database-performance.service";

@Controller("database/performance")
export class DatabasePerformanceController {
  private readonly logger = new Logger(DatabasePerformanceController.name);

  constructor(
    private readonly performanceService: DatabasePerformanceService,
  ) {}

  /**
   * Get in-depth database performance report
   */
  @Get("report")
  async getPerformanceReport(): Promise<DatabasePerformanceReport> {
    this.logger.debug("Performance report requested");
    return this.performanceService.getPerformanceReport();
  }

  /**
   * Get database configuration recommendations
   */
  @Get("config/recommendations")
  getConfigurationRecommendations() {
    this.logger.debug("Configuration recommendations requested");
    return {
      recommendations:
        this.performanceService.getConfigurationRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get index creation recommendations
   */
  @Get("index/recommendations")
  getIndexRecommendations() {
    this.logger.debug("Index recommendations requested");
    return {
      recommendations: this.performanceService.getIndexRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze a specific query's performance
   */
  @Post("query/analyze")
  async analyzeQuery(@Body() body: { query: string; params?: any[] }) {
    this.logger.debug("Query analysis requested");
    const result = await this.performanceService.analyzeQuery(
      body.query,
      body.params,
    );
    return {
      analysis: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Perform detailed query analysis with optimization recommendations
   */
  @Post("query/analyze/detailed")
  async analyzeQueryDetailed(@Body() body: { query: string; params?: any[] }) {
    this.logger.debug("Detailed query analysis requested");
    const result = await this.performanceService.analyzeQueryDetailed(
      body.query,
      body.params,
    );
    return {
      analysis: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate index creation SQL from suggestions
   */
  @Post("index/generate-sql")
  generateIndexSQL(@Body() body: { table: string; columns: string[]; type?: 'btree' | 'hash' | 'gin' | 'gist' }) {
    this.logger.debug("Index SQL generation requested");
    const suggestion = {
      table: body.table,
      columns: body.columns,
      type: body.type || 'btree',
      reason: 'User requested',
      impact: 'medium' as const,
    };

    return {
      sql: this.performanceService.generateIndexSQL(suggestion),
      suggestion,
      timestamp: new Date().toISOString(),
    };
  }
}
