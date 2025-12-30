import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/typeorm";
import { Connection, EntityManager } from "typeorm";

export interface DatabaseHealthStatus {
  status: "healthy" | "unhealthy";
  connectionCount: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  lastChecked: Date;
  uptime: number;
  poolConfig: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
}

@Injectable()
export class DatabaseConnectionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DatabaseConnectionService.name);
  private startTime: Date = new Date();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    // Skip health checks in test environment
    if (process.env.NODE_ENV === "test") {
      this.logger.log(
        "Database connection service initialized (test mode - health checks disabled)",
      );
      return;
    }

    this.logger.log("Database connection service initialized");

    // Start periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Check every 30 seconds

    // Perform initial health check
    await this.performHealthCheck();
  }

  async onModuleDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.logger.log("Database connection service destroyed");
  }

  /**
   * Get in-depth database health status
   */
  async getHealthStatus(): Promise<DatabaseHealthStatus> {
    try {
      const pool = (this.connection.driver as any).pool;

      if (!pool) {
        return {
          status: "unhealthy",
          connectionCount: 0,
          activeConnections: 0,
          idleConnections: 0,
          waitingClients: 0,
          totalCount: 0,
          idleCount: 0,
          waitingCount: 0,
          lastChecked: new Date(),
          uptime: Date.now() - this.startTime.getTime(),
          poolConfig: {
            min: 0,
            max: 0,
            idleTimeoutMillis: 0,
            acquireTimeoutMillis: 0,
          },
        };
      }

      const status: DatabaseHealthStatus = {
        status: "healthy",
        connectionCount: pool.totalCount || 0,
        activeConnections: pool.borrowedCount || 0,
        idleConnections: pool.availableCount || 0,
        waitingClients: pool.pendingCount || 0,
        totalCount: pool.totalCount || 0,
        idleCount: pool.availableCount || 0,
        waitingCount: pool.pendingCount || 0,
        lastChecked: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
        poolConfig: {
          min: pool.options?.min || 0,
          max: pool.options?.max || 10,
          idleTimeoutMillis: pool.options?.idleTimeoutMillis || 30000,
          acquireTimeoutMillis: pool.options?.acquireTimeoutMillis || 60000,
        },
      };

      return status;
    } catch (error) {
      this.logger.error("Failed to get database health status", error);
      return {
        status: "unhealthy",
        connectionCount: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingClients: 0,
        totalCount: 0,
        idleCount: 0,
        waitingCount: 0,
        lastChecked: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
        poolConfig: {
          min: 0,
          max: 0,
          idleTimeoutMillis: 0,
          acquireTimeoutMillis: 0,
        },
      };
    }
  }

  /**
   * Perform a basic health check by executing a simple query
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.query("SELECT 1");
      await queryRunner.release();

      this.logger.debug("Database health check passed");
      return true;
    } catch (error) {
      this.logger.error("Database health check failed", error);
      return false;
    }
  }

  /**
   * Check database health (alias for performHealthCheck)
   */
  async checkHealth(): Promise<boolean> {
    return this.performHealthCheck();
  }

  /**
   * Get connection pool statistics
   */
  async getPoolStats() {
    const status = await this.getHealthStatus();
    return {
      totalConnections: status.totalCount,
      activeConnections: status.activeConnections,
      idleConnections: status.idleCount,
      waitingClients: status.waitingCount,
      utilizationRate:
        status.totalCount > 0
          ? (status.activeConnections / status.totalCount) * 100
          : 0,
      poolConfig: status.poolConfig,
    };
  }

  /**
   * Execute a query with connection pooling
   */
  async executeQuery<T = any>(query: string, parameters?: any[]): Promise<T> {
    const queryRunner = this.connection.createQueryRunner();
    try {
      const result = await queryRunner.query(query, parameters);
      return result;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute a transaction with proper connection management
   */
  async executeTransaction<T>(
    operation: (entityManager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get database connection information
   */
  getConnectionInfo() {
    const options = this.connection.options as any;
    return {
      name: this.connection.name,
      type: options.type,
      host: options.host,
      port: options.port,
      database: options.database,
      isConnected: this.connection.isConnected,
      entities: this.connection.entityMetadatas.map((meta) => meta.name),
    };
  }

  /**
   * Force close idle connections (for maintenance)
   */
  async closeIdleConnections(): Promise<void> {
    try {
      const pool = (this.connection.driver as any).pool;
      if (pool && typeof pool.closeIdle === "function") {
        await pool.closeIdle();
        this.logger.log("Idle database connections closed");
      }
    } catch (error) {
      this.logger.error("Failed to close idle connections", error);
    }
  }

  /**
   * Get current connection count
   */
  getConnectionCount(): number {
    try {
      const pool = (this.connection.driver as any).pool;
      return pool?.totalCount || 0;
    } catch {
      return 0;
    }
  }
}
