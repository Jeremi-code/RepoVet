import { ActivityAnalyzer } from '../analyzers/activity.analyzer.js';
import { BusFactorAnalyzer } from '../analyzers/bus-factor.analyzer.js';
import { HygieneAnalyzer } from '../analyzers/hygiene.analyzer.js';
import { LanguageAnalyzer } from '../analyzers/language.analyzer.js';
import { StackAnalyzer } from '../analyzers/stack.analyzer.js';
import {
  APP_VERSION,
  type AuditReport,
  type ComparisonReport,
  type ComparisonWinner,
  parseRepoIdentifier,
  type RepoIdentifier,
  type RepoMetadata,
} from '../domain/models.js';
import {
  calculateActivityScore,
  calculateBusFactorScore,
  calculateCompositeHealthScore,
} from '../domain/scoring.js';
import { GitHubClient, type GitHubClientOptions } from '../infrastructure/github/client.js';

export interface AuditServiceOptions extends GitHubClientOptions {
  readonly client?: GitHubClient | undefined;
}

export class AuditService {
  private readonly client: GitHubClient;
  private readonly hygieneAnalyzer: HygieneAnalyzer;
  private readonly stackAnalyzer: StackAnalyzer;
  private readonly languageAnalyzer: LanguageAnalyzer;
  private readonly busFactorAnalyzer: BusFactorAnalyzer;
  private readonly activityAnalyzer: ActivityAnalyzer;

  constructor(options: AuditServiceOptions = {}) {
    this.client = options.client ?? new GitHubClient(options);
    this.hygieneAnalyzer = new HygieneAnalyzer(this.client);
    this.stackAnalyzer = new StackAnalyzer(this.client);
    this.languageAnalyzer = new LanguageAnalyzer(this.client);
    this.busFactorAnalyzer = new BusFactorAnalyzer(this.client);
    this.activityAnalyzer = new ActivityAnalyzer(this.client);
  }

  public async audit(target: string | RepoIdentifier): Promise<AuditReport> {
    const repo = typeof target === 'string' ? parseRepoIdentifier(target) : target;

    // Fetch repository metadata and run all analyzers concurrently
    const [repoResult, hygieneResult, stackResult, languagesResult, busFactorResult] =
      await Promise.all([
        this.client.getRepo(repo.owner, repo.name),
        this.hygieneAnalyzer.analyze(repo),
        this.stackAnalyzer.analyze(repo),
        this.languageAnalyzer.analyze(repo),
        this.busFactorAnalyzer.analyze(repo),
      ]);

    const rawMeta = repoResult.data;
    const metadata: RepoMetadata = {
      description: rawMeta.description,
      stars: rawMeta.stargazers_count,
      forks: rawMeta.forks_count,
      openIssues: rawMeta.open_issues_count,
      license: rawMeta.license?.spdx_id ?? rawMeta.license?.name ?? null,
      defaultBranch: rawMeta.default_branch,
      isArchived: rawMeta.archived,
      isFork: rawMeta.fork,
      createdAt: rawMeta.created_at,
      updatedAt: rawMeta.updated_at,
      pushedAt: rawMeta.pushed_at,
    };

    const activity = await this.activityAnalyzer.analyze(repo.owner, repo.name, metadata.pushedAt);

    const busFactorScore = calculateBusFactorScore(
      busFactorResult.busFactor,
      busFactorResult.giniCoefficient
    );

    const activityScore = calculateActivityScore(
      metadata.pushedAt,
      activity.commitsLast30Days,
      activity.commitsLast90Days
    );

    const healthScore = calculateCompositeHealthScore(
      hygieneResult.score,
      activityScore,
      busFactorScore
    );

    return {
      version: APP_VERSION,
      repo,
      timestamp: new Date().toISOString(),
      fromCache: repoResult.fromCache,
      metadata,
      hygiene: hygieneResult,
      languages: languagesResult,
      stack: stackResult,
      busFactor: busFactorResult,
      activity,
      healthScore,
    };
  }

  public async compare(targets: readonly (string | RepoIdentifier)[]): Promise<ComparisonReport> {
    if (targets.length === 0) {
      throw new Error('Comparison requires at least one repository target.');
    }

    const reports = await Promise.all(targets.map((t) => this.audit(t)));

    let winner: ComparisonWinner | undefined;
    if (reports.length > 1) {
      const sorted = [...reports].sort(
        (a, b) => b.healthScore.compositeScore - a.healthScore.compositeScore
      );
      const top = sorted[0];
      const runnerUp = sorted[1];

      if (top && runnerUp) {
        const reasons: string[] = [];
        if (top.healthScore.compositeScore > runnerUp.healthScore.compositeScore) {
          reasons.push(
            `Higher overall composite score (${top.healthScore.compositeScore}/100 vs ${runnerUp.healthScore.compositeScore}/100)`
          );
        }
        if (top.hygiene.score > runnerUp.hygiene.score) {
          reasons.push(
            `Stronger open-source hygiene standards (${top.hygiene.score} vs ${runnerUp.hygiene.score})`
          );
        }
        if (top.busFactor.busFactor > runnerUp.busFactor.busFactor) {
          reasons.push(
            `Higher contributor resilience (Bus Factor ${top.busFactor.busFactor} vs ${runnerUp.busFactor.busFactor})`
          );
        }
        if (top.activity.commitsLast30Days > runnerUp.activity.commitsLast30Days) {
          reasons.push(
            `Higher recent commit velocity (${top.activity.commitsLast30Days} vs ${runnerUp.activity.commitsLast30Days} commits in last 30d)`
          );
        }
        if (top.metadata.stars > runnerUp.metadata.stars) {
          reasons.push(
            `Larger community adoption (${top.metadata.stars.toLocaleString()} vs ${runnerUp.metadata.stars.toLocaleString()} stars)`
          );
        }

        if (reasons.length === 0) {
          reasons.push('Tied on key indicators with balanced health profile');
        }

        winner = {
          repo: top.repo,
          score: top.healthScore.compositeScore,
          grade: top.healthScore.grade,
          reasons,
        };
      }
    }

    return {
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
      reports,
      winner,
    };
  }
}
