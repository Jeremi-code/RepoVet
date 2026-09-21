import { describe, expect, it } from 'vitest';
import type { AuditReport, ComparisonReport } from '../../src/domain/models.js';
import { formatTerminalComparisonReport } from '../../src/formatters/comparison.formatter.js';

const mockReportA: AuditReport = {
  version: '1.3.0',
  repo: { owner: 'facebook', name: 'react' },
  timestamp: '2026-09-21T00:00:00.000Z',
  fromCache: false,
  metadata: {
    description: 'React library',
    stars: 220000,
    forks: 45000,
    openIssues: 700,
    license: 'MIT',
    defaultBranch: 'main',
    isArchived: false,
    isFork: false,
    createdAt: '2013-05-24T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z',
    pushedAt: '2026-09-21T00:00:00Z',
  },
  hygiene: {
    score: 95,
    grade: 'A+',
    checks: [],
  },
  languages: [{ name: 'JavaScript', bytes: 80000, percentage: 80 }],
  stack: {
    runtimes: ['Node.js'],
    packageManager: 'yarn',
    frameworks: ['React'],
    buildTools: ['Rollup'],
    hasDocker: false,
    ciWorkflows: [],
  },
  busFactor: {
    busFactor: 8,
    giniCoefficient: 0.42,
    risk: 'healthy',
    totalContributors: 1500,
    topContributors: [],
  },
  activity: {
    lastPushedDaysAgo: 0,
    commitsLast30Days: 85,
    commitsLast90Days: 240,
    isStale: false,
  },
  healthScore: {
    compositeScore: 92,
    grade: 'A',
    hygieneScore: 95,
    activityScore: 96,
    busFactorScore: 88,
  },
};

const mockReportB: AuditReport = {
  version: '1.3.0',
  repo: { owner: 'vuejs', name: 'core' },
  timestamp: '2026-09-21T00:00:00.000Z',
  fromCache: false,
  metadata: {
    description: 'Vue.js core',
    stars: 45000,
    forks: 8000,
    openIssues: 200,
    license: 'MIT',
    defaultBranch: 'main',
    isArchived: false,
    isFork: false,
    createdAt: '2018-09-01T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
    pushedAt: '2026-09-20T00:00:00Z',
  },
  hygiene: {
    score: 85,
    grade: 'A',
    checks: [],
  },
  languages: [{ name: 'TypeScript', bytes: 100000, percentage: 100 }],
  stack: {
    runtimes: ['Node.js'],
    packageManager: 'pnpm',
    frameworks: ['Vue'],
    buildTools: ['Vite'],
    hasDocker: false,
    ciWorkflows: [],
  },
  busFactor: {
    busFactor: 3,
    giniCoefficient: 0.65,
    risk: 'moderate',
    totalContributors: 300,
    topContributors: [],
  },
  activity: {
    lastPushedDaysAgo: 1,
    commitsLast30Days: 40,
    commitsLast90Days: 110,
    isStale: false,
  },
  healthScore: {
    compositeScore: 84,
    grade: 'B',
    hygieneScore: 85,
    activityScore: 90,
    busFactorScore: 75,
  },
};

describe('ComparisonTerminalFormatter', () => {
  it('renders side-by-side terminal comparison table and winner announcement', () => {
    const comparison: ComparisonReport = {
      version: '1.3.0',
      timestamp: '2026-09-21T00:00:00.000Z',
      reports: [mockReportA, mockReportB],
      winner: {
        repo: mockReportA.repo,
        score: 92,
        grade: 'A',
        reasons: ['Higher overall composite score (92/100 vs 84/100)'],
      },
    };

    const output = formatTerminalComparisonReport(comparison);

    expect(output).toContain('RepoVet: Multi-Repository Comparison Battle Mode');
    expect(output).toContain('facebook/react');
    expect(output).toContain('vuejs/core');
    expect(output).toContain('Top Pick / Winner:');
    expect(output).toContain('Higher overall composite score (92/100 vs 84/100)');
  });
});
