export interface CacheEntry<T> {
  readonly data: T;
  readonly etag?: string | undefined;
  readonly cachedAt: number;
  readonly ttlMs: number;
}

export interface CacheStorage<T> {
  get(key: string): CacheEntry<T> | undefined;
  set(key: string, data: T, etag?: string, ttlMs?: number): void;
  has(key: string): boolean;
  delete(key: string): boolean;
  clear(): void;
}
