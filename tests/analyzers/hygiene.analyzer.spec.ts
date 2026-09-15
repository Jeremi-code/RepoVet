import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HygieneAnalyzer } from '../../src/analyzers/hygiene.analyzer.js';
import { GitHubClient } from '../../src/infrastructure/github/client.js';
import { GitHubCommunityProfileResponse } from '../../src/infrastructure/github/types.js';

describe('HygieneAnalyzer', () => {
  const reactFixture = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/community-react.json'), 'utf-8')
  ) as GitHubCommunityProfileResponse;

  const emptyFixture = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/community-empty.json'), 'utf-8')
  ) as GitHubCommunityProfileResponse;

  it('correctly evaluates a fully compliant repository (React fixture)', async () => {
    // Mock client returning the React fixture
    const mockClient = {
      getCommunityProfile: async () => ({
        data: reactFixture,
        fromCache: false,
      }),
    } as unknown as GitHubClient;

    const analyzer = new HygieneAnalyzer(mockClient);
    const result = await analyzer.analyze({ owner: 'facebook', name: 'react' });

    expect(result.score).toBe(100);
    expect(result.grade).toBe('A+');
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((c) => c.found)).toBe(true);

    const licenseCheck = result.checks.find((c) => c.id === 'license');
    expect(licenseCheck?.found).toBe(true);
    expect(licenseCheck?.path).toBe('https://github.com/facebook/react/blob/main/LICENSE');
  });

  it('correctly evaluates a bare repository with zero hygiene files', async () => {
    const mockClient = {
      getCommunityProfile: async () => ({
        data: emptyFixture,
        fromCache: false,
      }),
    } as unknown as GitHubClient;

    const analyzer = new HygieneAnalyzer(mockClient);
    const result = await analyzer.analyze({ owner: 'unknown', name: 'bare-repo' });

    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
    expect(result.checks.every((c) => !c.found)).toBe(true);
  });
});
