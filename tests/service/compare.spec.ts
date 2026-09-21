import { describe, expect, it, vi } from 'vitest';
import type { AuditReport } from '../../src/domain/models.js';
import { AuditService } from '../../src/service/audit.service.js';

function createMockReport(
  owner: string,
  name: string,
  score: number,
  overrides: Partial<AuditReport> = {}
): AuditReport {
  return {
    version: '1.3.0',
    repo: { owner, name },
    timestamp: '2026-09-21T00:00:00.000Z',
    fromCache: false,
    metadata: {
      description: `${owner}/${name} description`,
      stars: 1000,
      forks: 100,
      openIssues: 10,
      license: 'MIT',
      defaultBranch: 'main',
      isArchived: false,
      isFork: false,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2026-09-21T00:00:00Z',
      pushedAt: '2026-09-21T00:00:00Z',
      ...overrides.metadata,
    },
    hygiene: {
      score: 80,
      grade: 'B',
      checks: [],
      ...overrides.hygiene,
    },
    languages: [{ name: 'TypeScript', bytes: 1000, percentage: 100 }],
    stack: {
      runtimes: ['Node.js'],
      packageManager: 'pnpm',
      frameworks: [],
      buildTools: [],
      hasDocker: false,
      ciWorkflows: [],
      ...overrides.stack,
    },
    busFactor: {
      busFactor: 3,
      giniCoefficient: 0.5,
      risk: 'moderate',
      totalContributors: 10,
      topContributors: [],
      ...overrides.busFactor,
    },
    activity: {
      lastPushedDaysAgo: 1,
      commitsLast30Days: 20,
      commitsLast90Days: 60,
      isStale: false,
      ...overrides.activity,
    },
    healthScore: {
      compositeScore: score,
      grade: 'B',
      hygieneScore: 80,
      activityScore: 80,
      busFactorScore: 80,
      ...overrides.healthScore,
    },
  };
}

describe('AuditService.compare', () => {
  it('throws error when targets list is empty', async () => {
    const service = new AuditService();
    await expect(service.compare([])).rejects.toThrow(
      'Comparison requires at least one repository target.'
    );
  });

  it('compares multiple repositories and determines the winner based on composite score', async () => {
    const service = new AuditService();
    const reportA = createMockReport('org', 'alpha', 92, {
      hygiene: { score: 95, grade: 'A+', checks: [] },
      busFactor: {
        busFactor: 5,
        giniCoefficient: 0.3,
        risk: 'healthy',
        totalContributors: 20,
        topContributors: [],
      },
      activity: {
        lastPushedDaysAgo: 0,
        commitsLast30Days: 50,
        commitsLast90Days: 150,
        isStale: false,
      },
      metadata: {
        stars: 15000,
        forks: 1200,
        openIssues: 5,
        license: 'MIT',
        defaultBranch: 'main',
        isArchived: false,
        isFork: false,
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        pushedAt: '2026-09-21T00:00:00Z',
      },
    });

    const reportB = createMockReport('org', 'beta', 75, {
      hygiene: { score: 70, grade: 'B', checks: [] },
      busFactor: {
        busFactor: 2,
        giniCoefficient: 0.7,
        risk: 'moderate',
        totalContributors: 5,
        topContributors: [],
      },
      activity: {
        lastPushedDaysAgo: 5,
        commitsLast30Days: 10,
        commitsLast90Days: 30,
        isStale: false,
      },
      metadata: {
        stars: 3000,
        forks: 200,
        openIssues: 20,
        license: 'MIT',
        defaultBranch: 'main',
        isArchived: false,
        isFork: false,
        createdAt: '2021-01-01T00:00:00Z',
        updatedAt: '2026-09-21T00:00:00Z',
        pushedAt: '2026-09-21T00:00:00Z',
      },
    });

    vi.spyOn(service, 'audit').mockImplementation(async (target) => {
      const targetStr = typeof target === 'string' ? target : `${target.owner}/${target.name}`;
      return targetStr.includes('alpha') ? reportA : reportB;
    });

    const result = await service.compare(['org/alpha', 'org/beta']);

    expect(result.reports).toHaveLength(2);
    expect(result.winner).toBeDefined();
    expect(result.winner?.repo.name).toBe('alpha');
    expect(result.winner?.score).toBe(92);
    expect(result.winner?.reasons.length).toBeGreaterThan(0);
    expect(result.winner?.reasons).toContain('Higher overall composite score (92/100 vs 75/100)');
    expect(result.winner?.reasons).toContain('Stronger open-source hygiene standards (95 vs 70)');
    expect(result.winner?.reasons).toContain('Higher contributor resilience (Bus Factor 5 vs 2)');
  });

  it('handles tied scores gracefully', async () => {
    const service = new AuditService();
    const reportA = createMockReport('org', 'alpha', 80);
    const reportB = createMockReport('org', 'beta', 80);

    vi.spyOn(service, 'audit').mockImplementation(async (target) => {
      const targetStr = typeof target === 'string' ? target : `${target.owner}/${target.name}`;
      return targetStr.includes('alpha') ? reportA : reportB;
    });

    const result = await service.compare(['org/alpha', 'org/beta']);

    expect(result.winner).toBeDefined();
    expect(result.winner?.reasons).toContain('Tied on key indicators with balanced health profile');
  });
});
