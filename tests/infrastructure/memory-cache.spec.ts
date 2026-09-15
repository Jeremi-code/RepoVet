import { describe, expect, it } from 'vitest';
import { MemoryCache } from '../../src/infrastructure/cache/memory-cache.js';

describe('MemoryCache', () => {
  it('stores and retrieves cache entries', () => {
    const cache = new MemoryCache<{ foo: string }>();
    cache.set('key1', { foo: 'bar' }, 'etag-123');

    const entry = cache.get('key1');
    expect(entry).toBeDefined();
    expect(entry?.data).toEqual({ foo: 'bar' });
    expect(entry?.etag).toBe('etag-123');
    expect(cache.has('key1')).toBe(true);
  });

  it('expires entries after TTL', async () => {
    const cache = new MemoryCache<string>(10); // 10ms TTL
    cache.set('key1', 'hello');

    expect(cache.get('key1')?.data).toBe('hello');

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 25));

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.has('key1')).toBe(false);
  });

  it('deletes entries correctly', () => {
    const cache = new MemoryCache<number>();
    cache.set('num', 42);
    expect(cache.delete('num')).toBe(true);
    expect(cache.get('num')).toBeUndefined();
    expect(cache.delete('num')).toBe(false);
  });

  it('clears all entries', () => {
    const cache = new MemoryCache<string>();
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });
});
