import { HygieneAnalyzer } from '../analyzers/hygiene.analyzer.js';
import {
  AuditReport,
  parseRepoIdentifier,
  RepoIdentifier,
  RepoMetadata,
} from '../domain/models.js';
import { GitHubClient, GitHubClientOptions } from '../infrastructure/github/client.js';

export interface AuditServiceOptions extends GitHubClientOptions {
  readonly client?: GitHubClient | undefined;
}

export class AuditService {
  private readonly client: GitHubClient;
  private readonly hygieneAnalyzer: HygieneAnalyzer;

  constructor(options: AuditServiceOptions = {}) {
    this.client = options.client ?? new GitHubClient(options);
    this.hygieneAnalyzer = new HygieneAnalyzer(this.client);
  }

  public async audit(target: string | RepoIdentifier): Promise<AuditReport> {
    const repo = typeof target === 'string' ? parseRepoIdentifier(target) : target;

    // Fetch repository metadata and run analyzers concurrently
    const [repoResult, hygieneResult] = await Promise.all([
      this.client.getRepo(repo.owner, repo.name),
      this.hygieneAnalyzer.analyze(repo),
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

    return {
      version: '0.0.1',
      repo,
      timestamp: new Date().toISOString(),
      fromCache: repoResult.fromCache,
      metadata,
      hygiene: hygieneResult,
    };
  }
}
