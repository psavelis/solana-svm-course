import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number;
  key?: string;
  prefix?: string;
}

export const Cache = (options: CacheOptions) => SetMetadata('cache', options);
