/**
 * Strongly typed GitHub REST API responses.
 */

export interface GitHubLicense {
  readonly key: string;
  readonly name: string;
  readonly spdx_id: string | null;
  readonly url: string | null;
}

export interface GitHubRepoResponse {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly description: string | null;
  readonly stargazers_count: number;
  readonly forks_count: number;
  readonly open_issues_count: number;
  readonly license: GitHubLicense | null;
  readonly default_branch: string;
  readonly archived: boolean;
  readonly fork: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly pushed_at: string;
}

export interface CommunityFile {
  readonly key?: string;
  readonly name?: string;
  readonly spdx_id?: string | null;
  readonly url?: string;
  readonly html_url?: string;
}

export interface GitHubCommunityProfileResponse {
  readonly health_percentage: number;
  readonly description: string | null;
  readonly documentation: string | null;
  readonly files: {
    readonly code_of_conduct?: CommunityFile | null;
    readonly code_of_conduct_file?: CommunityFile | null;
    readonly contributing?: CommunityFile | null;
    readonly issue_template?: CommunityFile | null;
    readonly pull_request_template?: CommunityFile | null;
    readonly license?: CommunityFile | null;
    readonly readme?: CommunityFile | null;
    readonly security?: CommunityFile | null;
  };
  readonly updated_at: string;
}

export interface RateLimitState {
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number;
}

export interface GitHubGitTreeItem {
  readonly path: string;
  readonly mode: string;
  readonly type: 'blob' | 'tree';
  readonly sha: string;
  readonly size?: number | undefined;
  readonly url: string;
}

export interface GitHubGitTreeResponse {
  readonly sha: string;
  readonly url: string;
  readonly tree: readonly GitHubGitTreeItem[];
  readonly truncated: boolean;
}

export type GitHubLanguagesResponse = Record<string, number>;
