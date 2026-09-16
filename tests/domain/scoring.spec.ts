import { describe, expect, it } from 'vitest';
import type { HygieneCheckItem } from '../../src/domain/models.js';
import {
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
