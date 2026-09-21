import { describe, expect, it } from 'vitest';
import { computeBusFactorResult } from '../../src/analyzers/bus-factor.analyzer.js';
import type { GitHubContributorItem } from '../../src/infrastructure/github/types.js';

describe('BusFactorAnalyzer', () => {
  it('returns empty result when no contributors found', () => {
    const res = computeBusFactorResult([]);
    expect(res.busFactor).toBe(0);
    expect(res.risk).toBe('high');
    expect(res.totalContributors).toBe(0);
    expect(res.topContributors).toEqual([]);
  });

  it('filters out automated bot accounts', () => {
    const contributors: GitHubContributorItem[] = [
      { login: 'dependabot[bot]', id: 1, contributions: 1000, avatar_url: '', html_url: '' },
      { login: 'renovate[bot]', id: 2, contributions: 500, avatar_url: '', html_url: '' },
      { login: 'alice', id: 3, contributions: 100, avatar_url: '', html_url: '' },
    ];

    const res = computeBusFactorResult(contributors);
    expect(res.totalContributors).toBe(1);
    expect(res.topContributors[0]?.login).toBe('alice');
    expect(res.topContributors[0]?.percentage).toBe(100);
  });

  it('calculates top contributor percentages and bus factor accurately', () => {
    const contributors: GitHubContributorItem[] = [
      { login: 'lead-dev', id: 1, contributions: 60, avatar_url: '', html_url: '' },
      { login: 'core-dev-2', id: 2, contributions: 25, avatar_url: '', html_url: '' },
      { login: 'core-dev-3', id: 3, contributions: 15, avatar_url: '', html_url: '' },
    ];

    const res = computeBusFactorResult(contributors);
    expect(res.totalContributors).toBe(3);
    expect(res.busFactor).toBe(1); // lead-dev has 60% >= 50%
    expect(res.risk).toBe('high');
    expect(res.topContributors[0]?.percentage).toBe(60);
    expect(res.topContributors[1]?.percentage).toBe(25);
    expect(res.topContributors[2]?.percentage).toBe(15);
  });
});
