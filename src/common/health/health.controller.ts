import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthCheckService, HealthCheck } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "./database.health";
import { KafkaHealthIndicator } from "./kafka.health";
import { RedisHealthIndicator } from "./redis.health";

/**
 * # Health Controller
 *
 * REST API for application health checks and readiness probes.
 *
 * ## Health Check Components
 *
 * The health check verifies all critical infrastructure:
 *
 * | Component | Check | Healthy When |
 * |-----------|-------|--------------|
 * | Database | Connection pool | Active connections available |
 * | Kafka | Broker connectivity | Can produce/consume |
 * | Redis | Connection status | Ping successful |
 *
 * ## Kubernetes Integration
 *
 * Designed for K8s liveness/readiness probes:
 *
 * ```yaml
 * livenessProbe:
 *   httpGet:
 *     path: /health
 *     port: 3000
 *   initialDelaySeconds: 15
 *   periodSeconds: 10
 *
 * readinessProbe:
 *   httpGet:
 *     path: /health
 *     port: 3000
 *   initialDelaySeconds: 5
 *   periodSeconds: 5
 * ```
 *
 * ## Response Format
 *
 * ```json
 * {
 *   "status": "ok",
 *   "info": {
 *     "database": { "status": "up" },
 *     "kafka": { "status": "up" },
 *     "redis": { "status": "up" }
 *   },
 *   "details": { ... }
 * }
 * ```
 *
 * @example
 * ```bash
 * curl http://localhost:3000/health
 * # Returns 200 if healthy, 503 if unhealthy
 * ```
 */
@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: DatabaseHealthIndicator,
    private kafka: KafkaHealthIndicator,
    private redis: RedisHealthIndicator,
  ) {}

  /**
   * Comprehensive health check for all system components.
   *
   * Returns HTTP 200 if all components healthy, HTTP 503 otherwise.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Check application health",
    description: "Verify database, Kafka, and Redis connectivity.",
  })
  @ApiResponse({ status: 200, description: "All systems healthy" })
  @ApiResponse({ status: 503, description: "One or more systems unhealthy" })
  check() {
    return this.health.check([
      () => this.db.isHealthy("database"),
      () => this.kafka.isHealthy("kafka"),
      () => this.redis.isHealthy("redis"),
    ]);
  }
}
