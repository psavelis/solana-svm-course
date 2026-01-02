import { Inject } from '@nestjs/common';
import 'reflect-metadata';
import { QueryCacheService, QueryCacheOptions } from './query-cache.service';

export const QUERY_CACHE_OPTIONS = Symbol('QUERY_CACHE_OPTIONS');

export function QueryCache(options: QueryCacheOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cacheOptions = { ttl: 300, keyPrefix: 'query', ...options };

    // Store options on the method for runtime access
    Reflect.defineMetadata(QUERY_CACHE_OPTIONS, cacheOptions, target, propertyKey);

    descriptor.value = async function (...args: any[]) {
      const queryCacheService = (this as any).queryCacheService;
      if (!queryCacheService) {
        throw new Error('QueryCacheService must be injected as queryCacheService property');
      }

      // Generate cache key from method name and arguments
      const key = `${propertyKey}:${JSON.stringify(args)}`;

      return queryCacheService.executeWithCache(key, () => method.apply(this, args), cacheOptions);
    };

    return descriptor;
  };
}
