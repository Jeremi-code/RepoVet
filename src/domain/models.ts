import { InvalidRepoIdentifierError } from './errors.js';

export const APP_VERSION = '1.1.0';

export interface RepoIdentifier {
  readonly owner: string;
  readonly name: string;
}

export type HealthGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export type CheckImportance = 'critical' | 'recommended' | 'optional';

export interface HygieneCheckItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly importance: CheckImportance;
  readonly found: boolean;
  readonly path?: string | undefined;
  readonly weight: number;
}

export interface HygieneResult {
  readonly score: number;
  readonly grade: HealthGrade;
  readonly checks: readonly HygieneCheckItem[];
}

export interface RepoMetadata {
  readonly description: string | null;
  readonly stars: number;
  readonly forks: number;
  readonly openIssues: number;
  readonly license: string | null;
  readonly defaultBranch: string;
  readonly isArchived: boolean;
  readonly isFork: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pushedAt: string;
}

export interface LanguageItem {
  readonly name: string;
  readonly bytes: number;
  readonly percentage: number;
}

export type LanguageBreakdown = readonly LanguageItem[];

export interface DetectedTechStack {
  readonly runtimes: readonly string[];
  readonly packageManager?: string | undefined;
  readonly frameworks: readonly string[];
  readonly buildTools: readonly string[];
  readonly ciWorkflows: readonly string[];
  readonly hasDocker: boolean;
}

export interface AuditReport {
  readonly version: string;
  readonly repo: RepoIdentifier;
  readonly timestamp: string;
  readonly fromCache: boolean;
  readonly metadata: RepoMetadata;
  readonly hygiene: HygieneResult;
  readonly languages: LanguageBreakdown;
  readonly stack: DetectedTechStack;
}

export type VetReport = AuditReport;

/**
 * Parses user input (e.g. 'facebook/react' or 'https://github.com/facebook/react')
 * into a typed RepoIdentifier.
 */
export function parseRepoIdentifier(rawInput: string): RepoIdentifier {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new InvalidRepoIdentifierError(rawInput, 'Repository target cannot be empty.');
  }

  // Handle full URLs like https://github.com/owner/repo or git@github.com:owner/repo.git
  const normalized = trimmed
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/^git@github\.com:/i, '')
    .replace(/\.git$/i, '')
    .replace(/^\/+|\/+$/g, '');

  const parts = normalized.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new InvalidRepoIdentifierError(
      rawInput,
      'Expected "owner/repo" or "https://github.com/owner/repo".'
    );
  }

  const owner = parts[0];
  const name = parts[1];

  // GitHub username and repository name validation rules
  // Owner: alphanumeric + hyphens, up to 39 chars
  // Repo: alphanumeric + hyphens, underscores, dots, up to 100 chars
  const ownerRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  const repoRegex = /^[a-zA-Z0-9_.-]{1,100}$/;

  if (!ownerRegex.test(owner)) {
    throw new InvalidRepoIdentifierError(
      rawInput,
      `Invalid GitHub owner name "${owner}". Must be alphanumeric and up to 39 characters.`
    );
  }

  if (!repoRegex.test(name)) {
    throw new InvalidRepoIdentifierError(
      rawInput,
      `Invalid GitHub repository name "${name}". Allowed characters: alphanumeric, ., -, _.`
    );
  }

  return { owner, name };
}
