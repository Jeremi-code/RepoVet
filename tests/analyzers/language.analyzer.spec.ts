import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  computeLanguageBreakdown,
  LanguageAnalyzer,
} from '../../src/analyzers/language.analyzer.js';
import type { GitHubClient } from '../../src/infrastructure/github/client.js';
import type { GitHubLanguagesResponse } from '../../src/infrastructure/github/types.js';

describe('LanguageAnalyzer & computeLanguageBreakdown', () => {
  const languagesFixture = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/languages-react.json'), 'utf-8')
  ) as GitHubLanguagesResponse;

  it('computes sorted percentages accurately', () => {
    const result = computeLanguageBreakdown(languagesFixture);

    expect(result).toHaveLength(4);
    // Highest byte count first
    expect(result[0]?.name).toBe('JavaScript');
    expect(result[0]?.percentage).toBeGreaterThan(60);

    expect(result[1]?.name).toBe('TypeScript');
    expect(result[1]?.percentage).toBeGreaterThan(30);

    expect(result[2]?.name).toBe('HTML');
    expect(result[3]?.name).toBe('CSS');

    // Sum of percentages should be approximately 100%
    const sum = result.reduce((acc, item) => acc + item.percentage, 0);
    expect(Math.round(sum)).toBe(100);
  });

  it('handles empty language payload gracefully', () => {
    const result = computeLanguageBreakdown({});
    expect(result).toEqual([]);
  });

  it('analyzes repository languages via GitHubClient', async () => {
    const mockClient = {
      getLanguages: async () => ({
        data: languagesFixture,
        fromCache: false,
      }),
    } as unknown as GitHubClient;

    const analyzer = new LanguageAnalyzer(mockClient);
    const breakdown = await analyzer.analyze({ owner: 'facebook', name: 'react' });

    expect(breakdown).toHaveLength(4);
    expect(breakdown[0]?.name).toBe('JavaScript');
  });
});
