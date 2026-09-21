import { describe, expect, it } from 'vitest';
import type { HygieneCheckItem } from '../../src/domain/models.js';
import {
  calculateActivityScore,
  calculateBusFactor,
  calculateCompositeHealthScore,
  calculateGiniCoefficient,
  calculateHealthGrade,
  calculateHygieneScore,
  HYGIENE_WEIGHTS,
} from '../../src/domain/scoring.js';

describe('calculateHealthGrade', () => {
  it('maps 95-100 to A+', () => {
    expect(calculateHealthGrade(100)).toBe('A+');
    expect(calculateHealthGrade(95)).toBe('A+');
  });

  it('maps 85-94 to A', () => {
    expect(calculateHealthGrade(94)).toBe('A');
    expect(calculateHealthGrade(85)).toBe('A');
  });

  it('maps 70-84 to B', () => {
    expect(calculateHealthGrade(84)).toBe('B');
    expect(calculateHealthGrade(70)).toBe('B');
  });

  it('maps 55-69 to C', () => {
    expect(calculateHealthGrade(69)).toBe('C');
    expect(calculateHealthGrade(55)).toBe('C');
  });

  it('maps 40-54 to D', () => {
    expect(calculateHealthGrade(54)).toBe('D');
    expect(calculateHealthGrade(40)).toBe('D');
  });

  it('maps below 40 to F', () => {
    expect(calculateHealthGrade(39)).toBe('F');
    expect(calculateHealthGrade(0)).toBe('F');
  });

  it('clamps values outside 0-100 bounds', () => {
    expect(calculateHealthGrade(150)).toBe('A+');
    expect(calculateHealthGrade(-20)).toBe('F');
  });
});

describe('calculateHygieneScore', () => {
  const sampleChecks: HygieneCheckItem[] = [
    {
      id: 'license',
      name: 'License',
      description: 'License check',
      importance: 'critical',
      found: true,
      weight: HYGIENE_WEIGHTS.LICENSE, // 35
    },
    {
      id: 'readme',
      name: 'README',
      description: 'Readme check',
      importance: 'critical',
      found: true,
      weight: HYGIENE_WEIGHTS.README, // 30
    },
    {
      id: 'security',
      name: 'Security Policy',
      description: 'Security check',
      importance: 'recommended',
      found: true,
      weight: HYGIENE_WEIGHTS.SECURITY, // 20
    },
    {
      id: 'contributing',
      name: 'Contributing',
      description: 'Contributing check',
      importance: 'recommended',
      found: true,
      weight: HYGIENE_WEIGHTS.CONTRIBUTING, // 10
    },
    {
      id: 'code-of-conduct',
      name: 'Code of Conduct',
      description: 'COC check',
      importance: 'optional',
      found: true,
      weight: HYGIENE_WEIGHTS.CODE_OF_CONDUCT, // 5
    },
  ];

  it('scores 100 / A+ when all checks are passed', () => {
    const result = calculateHygieneScore(sampleChecks);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A+');
  });

  it('scores 0 / F when all checks fail', () => {
    const failedChecks = sampleChecks.map((c) => ({ ...c, found: false }));
    const result = calculateHygieneScore(failedChecks);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });

  it('calculates weighted partial scores accurately', () => {
    // Only license (35) and readme (30) found -> 65 pts -> grade C
    const partialChecks = sampleChecks.map((c) => ({
      ...c,
      found: c.id === 'license' || c.id === 'readme',
    }));
    const result = calculateHygieneScore(partialChecks);
    expect(result.score).toBe(65);
    expect(result.grade).toBe('C');
  });

  it('handles empty checks gracefully', () => {
    const result = calculateHygieneScore([]);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });
});

describe('calculateGiniCoefficient', () => {
  it('returns 0 for empty or zero-contribution lists', () => {
    expect(calculateGiniCoefficient([])).toBe(0);
    expect(calculateGiniCoefficient([0, 0, 0])).toBe(0);
  });

  it('returns 1 for single contributor', () => {
    expect(calculateGiniCoefficient([100])).toBe(1);
  });

  it('returns 0.00 for perfectly equal distributions', () => {
    expect(calculateGiniCoefficient([10, 10, 10, 10])).toBe(0);
    expect(calculateGiniCoefficient([50, 50])).toBe(0);
  });

  it('calculates high inequality correctly', () => {
    // 1 top contributor with 900, 9 contributors with 10 each
    const contributions = [900, 10, 10, 10, 10, 10, 10, 10, 10, 10];
    const gini = calculateGiniCoefficient(contributions);
    expect(gini).toBeGreaterThanOrEqual(0.7);
  });
});

describe('calculateBusFactor', () => {
  it('returns bus factor 0 and high risk for empty list', () => {
    const res = calculateBusFactor([]);
    expect(res.busFactor).toBe(0);
    expect(res.risk).toBe('high');
  });

  it('returns bus factor 1 and high risk if 1 contributor owns >= 50%', () => {
    const res = calculateBusFactor([100, 20, 10, 5]);
    expect(res.busFactor).toBe(1);
    expect(res.risk).toBe('high');
  });

  it('returns moderate risk for bus factor 2 or 3', () => {
    // 30, 25, 20, 15, 10 -> total 100, top 2 have 55 >= 50 -> bus factor 2
    const res = calculateBusFactor([30, 25, 20, 15, 10]);
    expect(res.busFactor).toBe(2);
    expect(res.risk).toBe('moderate');
  });

  it('returns healthy risk for bus factor 4+', () => {
    // 10 equal contributors of 10 commits -> total 100 -> top 5 needed to hit 50 -> bus factor 5
    const res = calculateBusFactor([10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    expect(res.busFactor).toBe(5);
    expect(res.risk).toBe('healthy');
  });
});

describe('calculateActivityScore', () => {
  const fakeNow = new Date('2026-09-20T00:00:00Z');

  it('awards high score for recent push and active commit velocity', () => {
    const recentPush = '2026-09-18T00:00:00Z'; // 2 days ago
    const score = calculateActivityScore(recentPush, 25, 60, fakeNow);
    expect(score).toBe(100); // 50 recency + 30 (30d) + 20 (90d)
  });

  it('gives 0 recency points for dormant repo > 180 days', () => {
    const oldPush = '2025-01-01T00:00:00Z';
    const score = calculateActivityScore(oldPush, 0, 0, fakeNow);
    expect(score).toBe(0);
  });
});

describe('calculateCompositeHealthScore', () => {
  it('combines hygiene, activity, and bus factor according to weights', () => {
    // 40% of 100 = 40; 35% of 100 = 35; 25% of 100 = 25 -> 100 (A+)
    const perfect = calculateCompositeHealthScore(100, 100, 100);
    expect(perfect.compositeScore).toBe(100);
    expect(perfect.grade).toBe('A+');

    // 40% of 80 (32) + 35% of 60 (21) + 25% of 50 (12.5) = 65.5 -> 66 (C)
    const mid = calculateCompositeHealthScore(80, 60, 50);
    expect(mid.compositeScore).toBe(66);
    expect(mid.grade).toBe('C');
  });
});
