import process from 'node:process';

/**
 * Resolves a GitHub Personal Access Token from environment or CLI parameters.
 */
export function resolveGitHubToken(explicitToken?: string): string | undefined {
  if (explicitToken?.trim()) {
    return explicitToken.trim();
  }

  const envVars = ['REPO_AUDIT_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'];
  for (const varName of envVars) {
    const val = process.env[varName];
    if (val?.trim()) {
      return val.trim();
    }
  }

  return undefined;
}
