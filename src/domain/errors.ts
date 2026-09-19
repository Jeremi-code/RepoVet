/**
 * Strongly typed domain error hierarchy for RepoVet.
 * Designed to provide clear user guidance, precise exit codes, and zero unhandled crash dumps.
 */

export abstract class RepoVetError extends Error {
  public abstract readonly code: string;
  public abstract readonly exitCode: number;
  public readonly hint?: string | undefined;

  constructor(message: string, hint?: string | undefined) {
    super(message);
    this.name = this.constructor.name;
    this.hint = hint;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Backward-compatible alias */
export const RepoAuditError = RepoVetError;
export type RepoAuditError = RepoVetError;

export class InvalidRepoIdentifierError extends RepoVetError {
  public readonly code = 'INVALID_REPO_IDENTIFIER';
  public readonly exitCode = 1;

  constructor(input: string, details?: string) {
    const msg = `Invalid repository identifier: "${input}".${details ? ` ${details}` : ''}`;
    const hint = 'Format must be "owner/repo" (e.g. facebook/react) or a GitHub repository URL.';
    super(msg, hint);
  }
}

export class RepositoryNotFoundError extends RepoVetError {
  public readonly code = 'REPO_NOT_FOUND';
  public readonly exitCode = 1;

  constructor(owner: string, name: string) {
    const msg = `Repository "${owner}/${name}" was not found on GitHub.`;
    const hint =
      'Verify the repository exists, is publicly accessible, or provide a GITHUB_TOKEN if it is private.';
    super(msg, hint);
  }
}

export class RateLimitExceededError extends RepoVetError {
  public readonly code = 'RATE_LIMIT_EXCEEDED';
  public readonly exitCode = 1;
  public readonly resetAt: Date;

  constructor(resetTimestampSeconds: number, isAuthenticated: boolean) {
    const resetDate = new Date(resetTimestampSeconds * 1000);
    const now = new Date();
    const minutesLeft = Math.max(1, Math.ceil((resetDate.getTime() - now.getTime()) / 60000));

    const msg = `GitHub API rate limit exceeded. Limit will reset at ${resetDate.toLocaleTimeString()} (in ~${minutesLeft} minutes).`;
    const hint = isAuthenticated
      ? 'Your authenticated GitHub token has exhausted its 5,000 requests/hr quota.'
      : 'Unauthenticated requests are capped at 60/hr. Provide a token via REPO_VET_TOKEN, REPO_AUDIT_TOKEN, or GITHUB_TOKEN environment variable (or --token flag) for 5,000 req/hr.';

    super(msg, hint);
    this.resetAt = resetDate;
  }
}

export class BadCredentialsError extends RepoVetError {
  public readonly code = 'BAD_CREDENTIALS';
  public readonly exitCode = 1;

  constructor() {
    super(
      'The provided GitHub token is invalid or expired (HTTP 401 Unauthorized).',
      'Check your REPO_VET_TOKEN or GITHUB_TOKEN environment variable or pass a valid token via --token.'
    );
  }
}

export class NetworkError extends RepoVetError {
  public readonly code = 'NETWORK_ERROR';
  public readonly exitCode = 2;

  constructor(message: string, cause?: unknown) {
    super(
      `Network connectivity error: ${message}`,
      'Check your internet connection and verify that api.github.com is reachable.'
    );
    if (cause) {
      this.cause = cause;
    }
  }
}
