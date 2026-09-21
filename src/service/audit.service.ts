import { ActivityAnalyzer } from '../analyzers/activity.analyzer.js';
import { BusFactorAnalyzer } from '../analyzers/bus-factor.analyzer.js';
import { HygieneAnalyzer } from '../analyzers/hygiene.analyzer.js';
import { LanguageAnalyzer } from '../analyzers/language.analyzer.js';
import { StackAnalyzer } from '../analyzers/stack.analyzer.js';
import {
  APP_VERSION,
  type AuditReport,
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
}
