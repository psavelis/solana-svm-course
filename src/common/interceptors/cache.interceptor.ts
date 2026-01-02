import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../redis/cache.service';

export interface CacheOptions {
  ttl?: number;
  key?: string;
  prefix?: string;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get cache options from handler metadata or use defaults
    const handler = context.getHandler();
    const cacheOptions: CacheOptions = Reflect.getMetadata('cache', handler) || {};

    if (!cacheOptions.ttl) {
      // If no TTL specified, don't cache
      return next.handle();
    }

    // Generate cache key
    const cacheKey =
      cacheOptions.key ||
      `${request.method}:${request.url}:${JSON.stringify(request.query)}:${JSON.stringify(request.body)}`;

    // Try to get cached response
    const cachedResponse = await this.cacheService.get(cacheKey, {
      keyPrefix: cacheOptions.prefix || 'response',
    });

    if (cachedResponse) {
      // Return cached response
      response.setHeader('X-Cache', 'HIT');
      return of(cachedResponse);
    }

    // Execute handler and cache the response
    return next.handle().pipe(
      tap(async (data) => {
        // Cache the response
        await this.cacheService.set(cacheKey, data, {
          ttl: cacheOptions.ttl,
          keyPrefix: cacheOptions.prefix || 'response',
        });
        response.setHeader('X-Cache', 'MISS');
      }),
    );
  }
}
