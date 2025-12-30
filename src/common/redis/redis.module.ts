import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const redisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new Redis({
      host: configService.get('REDIS_HOST') || 'localhost',
      port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
    });
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisModule {}
