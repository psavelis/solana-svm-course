import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Kafka, logLevel } from 'kafkajs';

@Injectable()
export class KafkaHealthIndicator extends HealthIndicator {
  constructor(private configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const brokers = this.configService.get<string>('KAFKA_BROKERS') || 'localhost:9092';

    try {
      const kafka = new Kafka({
        clientId: 'health-check',
        brokers: brokers.split(','),
        logLevel: logLevel.ERROR,
      });

      const admin = kafka.admin();
      await admin.connect();
      await admin.fetchTopicMetadata();
      await admin.disconnect();

      return this.getStatus(key, true);
    } catch (error) {
      return this.getStatus(key, false, { error: error.message });
    }
  }
}
