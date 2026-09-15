import { describe, expect, it } from 'vitest';
import {
  BadCredentialsError,
  RateLimitExceededError,
  RepositoryNotFoundError,
} from '../../src/domain/errors.js';
import { GitHubClient } from '../../src/infrastructure/github/client.js';

describe('GitHubClient', () => {
  it('handles 200 OK and caches ETag', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ full_name: 'test/repo', stargazers_count: 10 }), {
        status: 200,
        headers: {
          etag: '"abc123etag"',
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '59',
          'x-ratelimit-reset': '1800000000',
        },
      });

    const client = new GitHubClient({ fetchFn: mockFetch });
    const res = await client.getRepo('test', 'repo');

    expect(res.fromCache).toBe(false);
    expect(res.data.full_name).toBe('test/repo');
    expect(client.getRateLimitState()?.remaining).toBe(59);
  });

  it('translates 404 to RepositoryNotFoundError', async () => {
    const mockFetch = async () =>
      new Response('Not Found', {
        status: 404,
        headers: {},
      });

    const client = new GitHubClient({ fetchFn: mockFetch });
    await expect(client.getRepo('ghost', 'missing')).rejects.toThrow(RepositoryNotFoundError);
  });

  it('translates 401 to BadCredentialsError', async () => {
    const mockFetch = async () =>
      new Response('Unauthorized', {
        status: 401,
        headers: {},
      });

    const client = new GitHubClient({ fetchFn: mockFetch });
    await expect(client.getRepo('test', 'repo')).rejects.toThrow(BadCredentialsError);
  });

  it('translates 403 with 0 remaining to RateLimitExceededError', async () => {
    const mockFetch = async () =>
      new Response('Forbidden', {
        status: 403,
        headers: {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': '1800000000',
        },
      });

    const client = new GitHubClient({ fetchFn: mockFetch });
    await expect(client.getRepo('test', 'repo')).rejects.toThrow(RateLimitExceededError);
  });

  it('handles 304 Not Modified using cached entry', async () => {
    let callCount = 0;
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      callCount++;
      if (callCount === 1) {
        return new Response(JSON.stringify({ full_name: 'test/repo', id: 1 }), {
          status: 200,
          headers: { etag: '"etag-1"' },
        });
      }
      // Second call sends If-None-Match: "etag-1"
      expect((init?.headers as Record<string, string>)?.['If-None-Match']).toBe('"etag-1"');
      return new Response(null, { status: 304 });
    };

    const client = new GitHubClient({ fetchFn: mockFetch });

    // First call (fetches fresh)
    const first = await client.getRepo('test', 'repo');
    expect(first.fromCache).toBe(false);

    // Second call (simulates cache validation with 304)
    // Force cache entry to re-validate by manipulating TTL or calling request
    const second = await client.getRepo('test', 'repo');
    expect(second.data.full_name).toBe('test/repo');
  });
});
