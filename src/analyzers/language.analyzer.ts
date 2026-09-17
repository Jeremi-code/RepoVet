import type { LanguageBreakdown, LanguageItem, RepoIdentifier } from '../domain/models.js';
import type { GitHubClient } from '../infrastructure/github/client.js';
import type { GitHubLanguagesResponse } from '../infrastructure/github/types.js';
import type { Analyzer } from './analyzer.interface.js';

export function computeLanguageBreakdown(rawLanguages: GitHubLanguagesResponse): LanguageBreakdown {
  const entries = Object.entries(rawLanguages);
  if (entries.length === 0) {
    return [];
  }

  const totalBytes = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (totalBytes === 0) {
    return [];
  }

  const items: LanguageItem[] = entries
    .map(([name, bytes]) => {
      const percentage = Math.round((bytes / totalBytes) * 1000) / 10; // 1 decimal place
      return { name, bytes, percentage };
    })
    .sort((a, b) => b.bytes - a.bytes);

  return items;
}

export class LanguageAnalyzer implements Analyzer<LanguageBreakdown> {
  public readonly name = 'languages';
  private readonly client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  public async analyze(repo: RepoIdentifier): Promise<LanguageBreakdown> {
    const { data: rawLanguages } = await this.client.getLanguages(repo.owner, repo.name);
    return computeLanguageBreakdown(rawLanguages);
  }
}
