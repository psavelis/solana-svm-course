import { Controller, Get, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseConnectionService, DatabaseHealthStatus } from './database-connection.service';

/**
 * # Database Connection Controller
 *
 * REST API for monitoring and managing PostgreSQL database connections.
 *
 * ## Connection Pooling
 *
 * TypeORM uses connection pooling for efficiency:
 *
 * ```
 * [Request 1] ─┐
 * [Request 2] ─┼── [Connection Pool] ── [PostgreSQL]
 * [Request 3] ─┘        (10-50 conns)
 * ```
 *
 * Pool settings (via environment):
 * - `DB_POOL_SIZE`: Max connections (default: 10)
 * - `DB_CONNECTION_TIMEOUT`: Acquire timeout (ms)
 *
 * ## Health Metrics
 *
 * | Metric | Description |
 * |--------|-------------|
 * | Active Connections | Currently in use |
 * | Idle Connections | Available in pool |
 * | Pending Requests | Waiting for connection |
 * | Total Created | Lifetime connections |
 *
 * @example
 * ```bash
 * # Check database health
 * curl http://localhost:3000/database/health
 *
 * # Get pool statistics
 * curl http://localhost:3000/database/pool/stats
 *
 * # Close idle connections (maintenance)
 * curl -X POST http://localhost:3000/database/pool/close-idle
 * ```
 */
@ApiTags('Database')
@Controller('database')
export class DatabaseConnectionController {
  private readonly logger = new Logger(DatabaseConnectionController.name);

  constructor(private readonly databaseConnectionService: DatabaseConnectionService) {}

  /**
   * Get in-depth database health status including connection pool metrics.
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get database health status',
    description: 'Returns connection pool health and metrics.',
  })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getHealth(): Promise<DatabaseHealthStatus> {
    this.logger.debug('Health check requested');
    return this.databaseConnectionService.getHealthStatus();
  }

  /**
   * Get detailed connection pool statistics.
   */
  @Get('pool/stats')
  @ApiOperation({
    summary: 'Get connection pool statistics',
    description: 'Returns active, idle, and pending connection counts.',
  })
  @ApiResponse({ status: 200, description: 'Pool stats retrieved' })
  async getPoolStats() {
    this.logger.debug('Pool stats requested');
    return this.databaseConnectionService.getPoolStats();
  }

  /**
   * Get database connection configuration information.
   */
  @Get('info')
  @ApiOperation({
    summary: 'Get database connection information',
    description: 'Returns database type, host, and pool configuration.',
  })
  @ApiResponse({ status: 200, description: 'Connection info retrieved' })
  getConnectionInfo() {
    this.logger.debug('Connection info requested');
    return this.databaseConnectionService.getConnectionInfo();
  }

  /**
   * Perform an active health check by executing a test query.
   */
  @Get('health/check')
  @ApiOperation({
    summary: 'Perform manual health check',
    description: 'Executes SELECT 1 to verify database connectivity.',
  })
  @ApiResponse({ status: 200, description: 'Health check performed' })
  async performHealthCheck() {
    this.logger.debug('Manual health check requested');
    const isHealthy = await this.databaseConnectionService.performHealthCheck();
    return {
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Close all idle connections in the pool (maintenance operation).
   *
   * Use during maintenance windows or when reducing resource usage.
   */
  @Post('pool/close-idle')
  @ApiOperation({
    summary: 'Close idle connections',
    description: 'Releases all unused connections back to the database.',
  })
  @ApiResponse({ status: 200, description: 'Idle connections closed' })
  async closeIdleConnections() {
    this.logger.warn('Closing idle connections requested');
    await this.databaseConnectionService.closeIdleConnections();
    return {
      message: 'Idle connections closed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current active connection count.
   */
  @Get('connections/count')
  @ApiOperation({
    summary: 'Get current connection count',
    description: 'Returns the number of active database connections.',
  })
  @ApiResponse({ status: 200, description: 'Connection count retrieved' })
  getConnectionCount() {
    const count = this.databaseConnectionService.getConnectionCount();
    return {
      connectionCount: count,
      timestamp: new Date().toISOString(),
    };
  }
}
