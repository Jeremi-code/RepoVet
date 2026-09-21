import { describe, expect, it } from 'vitest';
import { computeActivityMetrics } from '../../src/analyzers/activity.analyzer.js';
import type { GitHubParticipationResponse } from '../../src/infrastructure/github/types.js';

describe('ActivityAnalyzer', () => {
  const fakeNow = new Date('2026-09-20T12:00:00Z');

  it('computes recency days and aggregates commits across 30 and 90 days', () => {
    const pushedAt = '2026-09-17T12:00:00Z'; // 3 days ago

    // 52 weeks of participation, each week having 5 commits
    const allWeeks = Array(52).fill(5);
    const participation: GitHubParticipationResponse = {
      all: allWeeks,
      owner: allWeeks,
    };

    const res = computeActivityMetrics(pushedAt, participation, fakeNow);
    expect(res.lastPushedDaysAgo).toBe(3);
    expect(res.commitsLast30Days).toBe(20); // 4 weeks * 5
    expect(res.commitsLast90Days).toBe(65); // 13 weeks * 5
    expect(res.isStale).toBe(false);
  });

  it('identifies stale repositories inactive for > 180 days', () => {
    const pushedAt = '2025-01-01T00:00:00Z'; // > 600 days ago
    const participation: GitHubParticipationResponse = {
      all: Array(52).fill(0),
      owner: Array(52).fill(0),
    };

    const res = computeActivityMetrics(pushedAt, participation, fakeNow);
    expect(res.lastPushedDaysAgo).toBeGreaterThan(180);
    expect(res.commitsLast30Days).toBe(0);
    expect(res.commitsLast90Days).toBe(0);
    expect(res.isStale).toBe(true);
  });

  it('handles missing or undefined participation gracefully', () => {
    const pushedAt = '2026-09-19T12:00:00Z';
    const res = computeActivityMetrics(pushedAt, undefined, fakeNow);
    expect(res.lastPushedDaysAgo).toBe(1);
    expect(res.commitsLast30Days).toBe(0);
    expect(res.commitsLast90Days).toBe(0);
    expect(res.isStale).toBe(false);
  });
});
