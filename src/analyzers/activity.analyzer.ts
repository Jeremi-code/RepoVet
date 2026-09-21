import type { ActivityMetrics } from '../domain/models.js';
import type { GitHubClient } from '../infrastructure/github/client.js';
import type { GitHubParticipationResponse } from '../infrastructure/github/types.js';

export function computeActivityMetrics(
  pushedAt: string,
  participation?: GitHubParticipationResponse | undefined,
  now: Date = new Date()
): ActivityMetrics {
  const pushDate = new Date(pushedAt);
  const lastPushedDaysAgo = Math.max(
    0,
    Math.floor((now.getTime() - pushDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  let commitsLast30Days = 0;
  let commitsLast90Days = 0;

  if (participation?.all && Array.isArray(participation.all) && participation.all.length > 0) {
    const weeks = participation.all;
    // Last 4 weeks (~30 days)
    const last4Weeks = weeks.slice(-4);
    commitsLast30Days = last4Weeks.reduce((sum, count) => sum + count, 0);

    // Last 13 weeks (~90 days)
    const last13Weeks = weeks.slice(-13);
    commitsLast90Days = last13Weeks.reduce((sum, count) => sum + count, 0);
  }

  const isStale = lastPushedDaysAgo >= 180 || (commitsLast90Days === 0 && lastPushedDaysAgo >= 90);

  return {
    lastPushedDaysAgo,
    commitsLast30Days,
    commitsLast90Days,
    isStale,
  };
}

export class ActivityAnalyzer {
  public readonly name = 'activity';
  private readonly client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  public async analyze(owner: string, name: string, pushedAt: string): Promise<ActivityMetrics> {
    try {
      const { data: participation } = await this.client.getParticipation(owner, name);
      return computeActivityMetrics(pushedAt, participation);
    } catch {
      // If participation stats fail (e.g. 202 still compiling), fall back gracefully using pushedAt
      return computeActivityMetrics(pushedAt, undefined);
    }
  }
}
