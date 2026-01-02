import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let redisClient: any;

  beforeEach(async () => {
    const mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      exists: jest.fn(),
      flushdb: jest.fn(),
      mget: jest.fn(),
      pipeline: jest.fn(),
      incr: jest.fn(),
      decr: jest.fn(),
      expire: jest.fn(),
      ttl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    redisClient = mockRedisClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return parsed JSON value when key exists', async () => {
      const testData = { id: 1, name: 'test' };
      redisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await service.get('test-key');
      expect(result).toEqual(testData);
      expect(redisClient.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null when key does not exist', async () => {
      redisClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      redisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.get('test-key');
      expect(result).toBeNull();
    });

    it('should use key prefix when provided', async () => {
      redisClient.get.mockResolvedValue(JSON.stringify({ data: 'test' }));

      await service.get('test-key', { keyPrefix: 'prefix' });
      expect(redisClient.get).toHaveBeenCalledWith('prefix:test-key');
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      const testData = { id: 1, name: 'test' };

      await service.set('test-key', testData);
      expect(redisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should set value with TTL', async () => {
      const testData = { id: 1, name: 'test' };

      await service.set('test-key', testData, { ttl: 300 });
      expect(redisClient.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
    });

    it('should use key prefix when provided', async () => {
      const testData = { id: 1, name: 'test' };

      await service.set('test-key', testData, { keyPrefix: 'prefix' });
      expect(redisClient.set).toHaveBeenCalledWith('prefix:test-key', JSON.stringify(testData));
    });

    it('should handle errors gracefully', async () => {
      redisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('test-key', { data: 'test' })).resolves.not.toThrow();
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      await service.delete('test-key');
      expect(redisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should use key prefix when provided', async () => {
      await service.delete('test-key', { keyPrefix: 'prefix' });
      expect(redisClient.del).toHaveBeenCalledWith('prefix:test-key');
    });

    it('should handle errors gracefully', async () => {
      redisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.delete('test-key')).resolves.not.toThrow();
    });
  });

  describe('deleteByPattern', () => {
    it('should delete keys matching pattern', async () => {
      redisClient.keys.mockResolvedValue(['key1', 'key2']);

      await service.deleteByPattern('test-*');
      expect(redisClient.keys).toHaveBeenCalledWith('test-*');
      expect(redisClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    it('should use key prefix when provided', async () => {
      redisClient.keys.mockResolvedValue(['prefix:key1']);

      await service.deleteByPattern('test-*', { keyPrefix: 'prefix' });
      expect(redisClient.keys).toHaveBeenCalledWith('prefix:test-*');
    });

    it('should handle errors gracefully', async () => {
      redisClient.keys.mockRejectedValue(new Error('Redis error'));

      await expect(service.deleteByPattern('test-*')).resolves.not.toThrow();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      redisClient.exists.mockResolvedValue(1);

      const result = await service.exists('test-key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      redisClient.exists.mockResolvedValue(0);

      const result = await service.exists('test-key');
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      redisClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.exists('test-key');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all keys when no prefix provided', async () => {
      await service.clear();
      expect(redisClient.flushdb).toHaveBeenCalled();
    });

    it('should clear keys with prefix when provided', async () => {
      redisClient.keys.mockResolvedValue(['prefix:key1', 'prefix:key2']);

      await service.clear({ keyPrefix: 'prefix' });
      expect(redisClient.keys).toHaveBeenCalledWith('prefix:*');
      expect(redisClient.del).toHaveBeenCalledWith('prefix:key1', 'prefix:key2');
    });

    it('should handle errors gracefully', async () => {
      redisClient.flushdb.mockRejectedValue(new Error('Redis error'));

      await expect(service.clear()).resolves.not.toThrow();
    });
  });

  describe('getMultiple', () => {
    it('should return multiple values', async () => {
      const values = [JSON.stringify({ id: 1 }), JSON.stringify({ id: 2 }), null];
      redisClient.mget.mockResolvedValue(values);

      const result = await service.getMultiple(['key1', 'key2', 'key3']);
      expect(result).toEqual([{ id: 1 }, { id: 2 }, null]);
    });

    it('should handle JSON parse errors', async () => {
      const values = ['invalid json', JSON.stringify({ id: 1 })];
      redisClient.mget.mockResolvedValue(values);

      const result = await service.getMultiple(['key1', 'key2']);
      expect(result).toEqual([null, { id: 1 }]);
    });

    it('should handle errors gracefully', async () => {
      redisClient.mget.mockRejectedValue(new Error('Redis error'));

      const result = await service.getMultiple(['key1', 'key2']);
      expect(result).toEqual([null, null]);
    });
  });

  describe('setMultiple', () => {
    it('should set multiple values', async () => {
      const entries = [
        { key: 'key1', value: { id: 1 } },
        { key: 'key2', value: { id: 2 } },
      ];
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      redisClient.pipeline.mockReturnValue(mockPipeline);

      await service.setMultiple(entries, { ttl: 300 });
      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Redis error')),
      };
      redisClient.pipeline.mockReturnValue(mockPipeline);

      await expect(service.setMultiple([{ key: 'key1', value: 'value1' }])).resolves.not.toThrow();
    });
  });

  describe('increment', () => {
    it('should increment value', async () => {
      redisClient.incr.mockResolvedValue(5);

      const result = await service.increment('counter');
      expect(result).toBe(5);
      expect(redisClient.incr).toHaveBeenCalledWith('counter');
    });

    it('should handle errors gracefully', async () => {
      redisClient.incr.mockRejectedValue(new Error('Redis error'));

      const result = await service.increment('counter');
      expect(result).toBe(0);
    });
  });

  describe('decrement', () => {
    it('should decrement value', async () => {
      redisClient.decr.mockResolvedValue(3);

      const result = await service.decrement('counter');
      expect(result).toBe(3);
      expect(redisClient.decr).toHaveBeenCalledWith('counter');
    });

    it('should handle errors gracefully', async () => {
      redisClient.decr.mockRejectedValue(new Error('Redis error'));

      const result = await service.decrement('counter');
      expect(result).toBe(0);
    });
  });

  describe('expire', () => {
    it('should set expiration on key', async () => {
      await service.expire('test-key', 300);
      expect(redisClient.expire).toHaveBeenCalledWith('test-key', 300);
    });

    it('should handle errors gracefully', async () => {
      redisClient.expire.mockRejectedValue(new Error('Redis error'));

      await expect(service.expire('test-key', 300)).resolves.not.toThrow();
    });
  });

  describe('getTtl', () => {
    it('should return TTL of key', async () => {
      redisClient.ttl.mockResolvedValue(300);

      const result = await service.getTtl('test-key');
      expect(result).toBe(300);
    });

    it('should handle errors gracefully', async () => {
      redisClient.ttl.mockRejectedValue(new Error('Redis error'));

      const result = await service.getTtl('test-key');
      expect(result).toBe(-1);
    });
  });
});
