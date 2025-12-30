import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DatabaseConnectionService } from '../../database/database-connection.service';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(private dbService: DatabaseConnectionService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const isHealthy = await this.dbService.checkHealth();
    const result = this.getStatus(key, isHealthy);

    if (isHealthy) {
      return result;
    }

    return result;
  }
}