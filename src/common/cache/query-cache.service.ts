import { Inject, Injectable } from '@nestjs/common';
import { CacheService } from '../redis/cache.service';

export interface QueryCacheOptions {
  ttl?: number;
  keyPrefix?: string;
}

@Injectable()
export class QueryCacheService {
  constructor(
    @Inject('CacheService')
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Execute a query with caching
   */
  async executeWithCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: QueryCacheOptions = {},
  ): Promise<T> {
    const { ttl = 300, keyPrefix = 'query' } = options;
    const cacheKey = `${keyPrefix}:${key}`;

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<T>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    // Execute query and cache result
    const result = await queryFn();
    await this.cacheService.set(cacheKey, result, { ttl });
    return result;
  }

  /**
   * Invalidate cache for a specific key pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.cacheService.deleteByPattern(pattern);
  }

  /**
   * Clear all query cache
   */
  async clearQueryCache(): Promise<void> {
    await this.cacheService.deleteByPattern('query:*');
  }
}