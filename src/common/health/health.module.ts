import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { DatabaseHealthIndicator } from "./database.health";
import { KafkaHealthIndicator } from "./kafka.health";
import { RedisHealthIndicator } from "./redis.health";
import { DatabaseModule } from "../../database/database.module";
import { KafkaModule } from "../kafka/kafka.module";
import { RedisModule } from "../redis/redis.module";

@Module({
  imports: [TerminusModule, DatabaseModule, KafkaModule, RedisModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthIndicator,
    KafkaHealthIndicator,
    RedisHealthIndicator,
  ],
})
export class HealthModule {}
