import type { CacheEntry, CacheStorage } from './cache.interface.js';

export class MemoryCache<T> implements CacheStorage<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = 5 * 60 * 1000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public get(key: string): CacheEntry<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    const now = Date.now();
    if (now - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      return undefined;
    }

    return entry;
  }

  public set(key: string, data: T, etag?: string, ttlMs?: number): void {
    const entry: CacheEntry<T> = {
      data,
      etag,
      cachedAt: Date.now(),
      ttlMs: ttlMs ?? this.defaultTtlMs,
    };
    this.store.set(key, entry);
  }

  public has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}
