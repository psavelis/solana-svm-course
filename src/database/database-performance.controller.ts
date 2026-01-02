import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  DatabasePerformanceService,
  DatabasePerformanceReport,
} from './database-performance.service';

/**
 * # Database Performance Controller
 *
 * REST API for database performance analysis and optimization.
 *
 * ## Performance Monitoring
 *
 * This controller provides tools for:
 * - Query performance analysis (EXPLAIN ANALYZE)
 * - Index recommendations
 * - Configuration optimization
 * - Slow query detection
 *
 * ## Query Analysis
 *
 * Uses PostgreSQL's EXPLAIN ANALYZE for detailed execution plans:
 *
 * ```sql
 * EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
 * SELECT * FROM transactions WHERE status = 'pending';
 * ```
 *
 * Returns:
 * - Execution time
 * - Rows scanned vs returned
 * - Index usage
 * - Buffer hits/misses
 *
 * ## Index Recommendations
 *
 * Analyzes query patterns and suggests:
 * - Missing indexes
 * - Unused indexes
 * - Composite index opportunities
 *
 * @example
 * ```bash
 * # Get performance report
 * curl http://localhost:3000/database/performance/report
 *
 * # Analyze a specific query
 * curl -X POST http://localhost:3000/database/performance/query/analyze \
 *   -H "Content-Type: application/json" \
 *   -d '{"query": "SELECT * FROM transactions WHERE status = $1", "params": ["pending"]}'
 *
 * # Get index recommendations
 * curl http://localhost:3000/database/performance/index/recommendations
 * ```
 */
@ApiTags('Database Performance')
@Controller('database/performance')
export class DatabasePerformanceController {
  private readonly logger = new Logger(DatabasePerformanceController.name);

  constructor(private readonly performanceService: DatabasePerformanceService) {}

  /**
   * Get comprehensive database performance report.
   */
  @Get('report')
  @ApiOperation({
    summary: 'Get performance report',
    description: 'Returns comprehensive database performance metrics and analysis.',
  })
  @ApiResponse({ status: 200, description: 'Performance report retrieved' })
  async getPerformanceReport(): Promise<DatabasePerformanceReport> {
    this.logger.debug('Performance report requested');
    return this.performanceService.getPerformanceReport();
  }

  /**
   * Get database configuration recommendations for optimization.
   */
  @Get('config/recommendations')
  @ApiOperation({
    summary: 'Get configuration recommendations',
    description: 'Returns PostgreSQL configuration tuning suggestions.',
  })
  @ApiResponse({ status: 200, description: 'Recommendations retrieved' })
  getConfigurationRecommendations() {
    this.logger.debug('Configuration recommendations requested');
    return {
      recommendations: this.performanceService.getConfigurationRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get recommendations for index creation based on query patterns.
   */
  @Get('index/recommendations')
  @ApiOperation({
    summary: 'Get index recommendations',
    description: 'Analyzes tables and suggests indexes for better performance.',
  })
  @ApiResponse({ status: 200, description: 'Index recommendations retrieved' })
  getIndexRecommendations() {
    this.logger.debug('Index recommendations requested');
    return {
      recommendations: this.performanceService.getIndexRecommendations(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze a specific query's performance using EXPLAIN.
   */
  @Post('query/analyze')
  @ApiOperation({
    summary: 'Analyze query performance',
    description: 'Runs EXPLAIN on a query to show execution plan.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', example: 'SELECT * FROM transactions WHERE status = $1' },
        params: { type: 'array', items: { type: 'string' }, example: ['pending'] },
      },
      required: ['query'],
    },
  })
  @ApiResponse({ status: 200, description: 'Query analysis completed' })
  async analyzeQuery(@Body() body: { query: string; params?: any[] }) {
    this.logger.debug('Query analysis requested');
    const result = await this.performanceService.analyzeQuery(body.query, body.params);
    return {
      analysis: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Perform detailed query analysis with optimization recommendations.
   */
  @Post('query/analyze/detailed')
  @ApiOperation({
    summary: 'Detailed query analysis',
    description: 'Runs EXPLAIN ANALYZE with buffers for comprehensive analysis.',
  })
  @ApiResponse({ status: 200, description: 'Detailed analysis completed' })
  async analyzeQueryDetailed(@Body() body: { query: string; params?: any[] }) {
    this.logger.debug('Detailed query analysis requested');
    const result = await this.performanceService.analyzeQueryDetailed(body.query, body.params);
    return {
      analysis: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate SQL statement for creating an index.
   */
  @Post('index/generate-sql')
  @ApiOperation({
    summary: 'Generate index SQL',
    description: 'Creates CREATE INDEX statement from specification.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        table: { type: 'string', example: 'transactions' },
        columns: { type: 'array', items: { type: 'string' }, example: ['status', 'created_at'] },
        type: { type: 'string', enum: ['btree', 'hash', 'gin', 'gist'], default: 'btree' },
      },
      required: ['table', 'columns'],
    },
  })
  @ApiResponse({ status: 200, description: 'Index SQL generated' })
  generateIndexSQL(
    @Body() body: { table: string; columns: string[]; type?: 'btree' | 'hash' | 'gin' | 'gist' },
  ) {
    this.logger.debug('Index SQL generation requested');
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
