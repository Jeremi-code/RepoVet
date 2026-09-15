import {
  BadCredentialsError,
  NetworkError,
  RateLimitExceededError,
  RepositoryNotFoundError,
} from '../../domain/errors.js';
import { CacheStorage } from '../cache/cache.interface.js';
import { MemoryCache } from '../cache/memory-cache.js';
import {
  GitHubCommunityProfileResponse,
  GitHubRepoResponse,
  RateLimitState,
} from './types.js';

export interface GitHubClientOptions {
  readonly baseUrl?: string | undefined;
  readonly token?: string | undefined;
  readonly cache?: CacheStorage<unknown> | undefined;
  readonly fetchFn?: typeof fetch | undefined;
  readonly userAgent?: string | undefined;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string | undefined;
  private readonly cache: CacheStorage<unknown>;
  private readonly fetchFn: typeof fetch;
  private readonly userAgent: string;
  private lastRateLimitState?: RateLimitState | undefined;

  constructor(options: GitHubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://api.github.com').replace(/\/+$/, '');
    this.token = options.token;
    this.cache = options.cache ?? new MemoryCache<unknown>();
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? 'repo-audit/0.0.1';
  }

  public getRateLimitState(): RateLimitState | undefined {
    return this.lastRateLimitState;
  }

  public async getRepo(
    owner: string,
    name: string
  ): Promise<{ data: GitHubRepoResponse; fromCache: boolean }> {
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
    return this.request<GitHubRepoResponse>(endpoint, owner, name);
  }

  public async getCommunityProfile(
    owner: string,
    name: string
  ): Promise<{ data: GitHubCommunityProfileResponse; fromCache: boolean }> {
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/community/profile`;
    return this.request<GitHubCommunityProfileResponse>(endpoint, owner, name);
  }

  private async request<T>(
    endpoint: string,
    owner: string,
    name: string
  ): Promise<{ data: T; fromCache: boolean }> {
    const url = `${this.baseUrl}${endpoint}`;
    const cacheKey = `github:${endpoint}`;
    const cachedEntry = this.cache.get(cacheKey);

    // Fast-path: active cache entry with remaining TTL
    if (cachedEntry && Date.now() - cachedEntry.cachedAt < cachedEntry.ttlMs) {
      return { data: cachedEntry.data as T, fromCache: true };
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': this.userAgent,
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    if (cachedEntry?.etag) {
      headers['If-None-Match'] = cachedEntry.etag;
    }

    let response: Response;
    try {
      response = await this.fetchFn(url, { headers });
    } catch (err: unknown) {
      throw new NetworkError((err as Error).message ?? 'Request failed', err);
    }

    this.trackRateLimits(response.headers);

    // 304 Not Modified: Cache is still valid
    if (response.status === 304 && cachedEntry) {
      this.cache.set(cacheKey, cachedEntry.data, cachedEntry.etag);
      return { data: cachedEntry.data as T, fromCache: true };
    }

    // 401: Invalid or expired token
    if (response.status === 401) {
      throw new BadCredentialsError();
    }

    // 404: Repository not found or private without sufficient token scope
    if (response.status === 404) {
      throw new RepositoryNotFoundError(owner, name);
    }

    // Rate limiting (403 or 429)
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      if (remaining === '0' && reset) {
        throw new RateLimitExceededError(parseInt(reset, 10), !!this.token);
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new NetworkError(
        `GitHub API returned status ${response.status} (${response.statusText}): ${errorText}`
      );
    }

    const data = (await response.json()) as T;
    const newEtag = response.headers.get('etag') ?? undefined;
    this.cache.set(cacheKey, data, newEtag);

    return { data, fromCache: false };
  }

  private trackRateLimits(headers: Headers): void {
    const limitHeader = headers.get('x-ratelimit-limit');
    const remainingHeader = headers.get('x-ratelimit-remaining');
    const resetHeader = headers.get('x-ratelimit-reset');

    if (limitHeader && remainingHeader && resetHeader) {
      this.lastRateLimitState = {
        limit: parseInt(limitHeader, 10),
        remaining: parseInt(remainingHeader, 10),
        reset: parseInt(resetHeader, 10),
      };
    }
  }
}
