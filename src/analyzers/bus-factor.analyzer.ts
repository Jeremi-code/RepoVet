import type { BusFactorResult, ContributorStat, RepoIdentifier } from '../domain/models.js';
import { calculateBusFactor, calculateGiniCoefficient } from '../domain/scoring.js';
import type { GitHubClient } from '../infrastructure/github/client.js';
import type { GitHubContributorItem } from '../infrastructure/github/types.js';
import type { Analyzer } from './analyzer.interface.js';

export function computeBusFactorResult(
  contributors: readonly GitHubContributorItem[]
): BusFactorResult {
  // Filter out known automated bots
  const humanContributors = contributors.filter(
    (c) =>
      !c.login.endsWith('[bot]') &&
      !c.login.includes('dependabot') &&
      !c.login.includes('renovate') &&
      c.type !== 'Bot'
  );

  if (humanContributors.length === 0) {
    return {
      busFactor: 0,
      risk: 'high',
      giniCoefficient: 0,
      totalContributors: 0,
      topContributors: [],
    };
  }

  const sorted = [...humanContributors].sort((a, b) => b.contributions - a.contributions);
  const contributionCounts = sorted.map((c) => c.contributions);
  const totalContributions = contributionCounts.reduce((sum, val) => sum + val, 0);

  const { busFactor, risk } = calculateBusFactor(contributionCounts);
  const giniCoefficient = calculateGiniCoefficient(contributionCounts);

  const topContributors: ContributorStat[] = sorted.slice(0, 3).map((c) => ({
    login: c.login,
    contributions: c.contributions,
    percentage:
      totalContributions > 0 ? Math.round((c.contributions / totalContributions) * 1000) / 10 : 0,
  }));

  return {
    busFactor,
    risk,
    giniCoefficient,
    totalContributors: humanContributors.length,
    topContributors,
  };
}

export class BusFactorAnalyzer implements Analyzer<BusFactorResult> {
  public readonly name = 'busFactor';
  private readonly client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  public async analyze(repo: RepoIdentifier): Promise<BusFactorResult> {
    try {
      const { data: contributors } = await this.client.getContributors(repo.owner, repo.name);
      return computeBusFactorResult(contributors);
    } catch {
      // If contributors endpoint fails (e.g. empty repository or rate limit), return fallback
      return {
        busFactor: 0,
        risk: 'high',
        giniCoefficient: 0,
        totalContributors: 0,
        topContributors: [],
      };
    }
  }
}
