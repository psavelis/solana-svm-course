import { Controller, Get, Post, Logger } from '@nestjs/common';
import { DatabaseConnectionService, DatabaseHealthStatus } from './database-connection.service';

@Controller('database')
export class DatabaseConnectionController {
  private readonly logger = new Logger(DatabaseConnectionController.name);

  constructor(
    private readonly databaseConnectionService: DatabaseConnectionService,
  ) {}

  /**
   * Get comprehensive database health status
   */
  @Get('health')
  async getHealth(): Promise<DatabaseHealthStatus> {
    this.logger.debug('Health check requested');
    return this.databaseConnectionService.getHealthStatus();
  }

  /**
   * Get connection pool statistics
   */
  @Get('pool/stats')
  async getPoolStats() {
    this.logger.debug('Pool stats requested');
    return this.databaseConnectionService.getPoolStats();
  }

  /**
   * Get database connection information
   */
  @Get('info')
  getConnectionInfo() {
    this.logger.debug('Connection info requested');
    return this.databaseConnectionService.getConnectionInfo();
  }

  /**
   * Perform a manual health check
   */
  @Get('health/check')
  async performHealthCheck() {
    this.logger.debug('Manual health check requested');
    const isHealthy = await this.databaseConnectionService.performHealthCheck();
    return {
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Close idle connections (maintenance operation)
   */
  @Post('pool/close-idle')
  async closeIdleConnections() {
    this.logger.warn('Closing idle connections requested');
    await this.databaseConnectionService.closeIdleConnections();
    return {
      message: 'Idle connections closed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current connection count
   */
  @Get('connections/count')
  getConnectionCount() {
    const count = this.databaseConnectionService.getConnectionCount();
    return {
      connectionCount: count,
      timestamp: new Date().toISOString(),
    };
  }
}