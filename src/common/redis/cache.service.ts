import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  private getKey(key: string, prefix?: string): string {
    return prefix ? `${prefix}:${key}` : key;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      const value = await this.redisClient.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions,
  ): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      const serializedValue = JSON.stringify(value);

      if (options?.ttl) {
        await this.redisClient.setex(cacheKey, options.ttl, serializedValue);
      } else {
        await this.redisClient.set(cacheKey, serializedValue);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      await this.redisClient.del(cacheKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async deleteByPattern(pattern: string, options?: CacheOptions): Promise<void> {
    try {
      const prefix = options?.keyPrefix || '';
      const searchPattern = prefix ? `${prefix}:${pattern}` : pattern;

      const keys = await this.redisClient.keys(searchPattern);
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      console.error('Cache delete by pattern error:', error);
    }
  }

  async exists(key: string, options?: CacheOptions): Promise<boolean> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      const result = await this.redisClient.exists(cacheKey);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async clear(options?: CacheOptions): Promise<void> {
    try {
      if (options?.keyPrefix) {
        const pattern = `${options.keyPrefix}:*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } else {
        await this.redisClient.flushdb();
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async getMultiple<T>(
    keys: string[],
    options?: CacheOptions,
  ): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.getKey(key, options?.keyPrefix));
      const values = await this.redisClient.mget(...cacheKeys);

      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error('Cache get multiple error:', error);
      return keys.map(() => null);
    }
  }

  async setMultiple<T>(
    entries: Array<{ key: string; value: T }>,
    options?: CacheOptions,
  ): Promise<void> {
    try {
      const pipeline = this.redisClient.pipeline();

      entries.forEach(({ key, value }) => {
        const cacheKey = this.getKey(key, options?.keyPrefix);
        const serializedValue = JSON.stringify(value);

        if (options?.ttl) {
          pipeline.setex(cacheKey, options.ttl, serializedValue);
        } else {
          pipeline.set(cacheKey, serializedValue);
        }
      });

      await pipeline.exec();
    } catch (error) {
      console.error('Cache set multiple error:', error);
    }
  }

  async increment(key: string, options?: CacheOptions): Promise<number> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      return await this.redisClient.incr(cacheKey);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  async decrement(key: string, options?: CacheOptions): Promise<number> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      return await this.redisClient.decr(cacheKey);
    } catch (error) {
      console.error('Cache decrement error:', error);
      return 0;
    }
  }

  async expire(key: string, ttl: number, options?: CacheOptions): Promise<void> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      await this.redisClient.expire(cacheKey, ttl);
    } catch (error) {
      console.error('Cache expire error:', error);
    }
  }

  async getTtl(key: string, options?: CacheOptions): Promise<number> {
    try {
      const cacheKey = this.getKey(key, options?.keyPrefix);
      return await this.redisClient.ttl(cacheKey);
    } catch (error) {
      console.error('Cache get TTL error:', error);
      return -1;
    }
  }
}