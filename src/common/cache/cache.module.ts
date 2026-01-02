import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { QueryCacheService } from './query-cache.service';

@Module({
  imports: [RedisModule],
  providers: [QueryCacheService],
  exports: [QueryCacheService],
})
export class CacheModule {}
