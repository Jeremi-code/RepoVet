import type { DetectedTechStack, RepoIdentifier } from '../domain/models.js';
import type { GitHubClient } from '../infrastructure/github/client.js';
import type { GitHubGitTreeItem } from '../infrastructure/github/types.js';
import type { Analyzer } from './analyzer.interface.js';

export function detectTechStackFromTree(
  treeItems: readonly GitHubGitTreeItem[]
): DetectedTechStack {
  const fileNames = new Set(
    treeItems.map((item) => {
      const parts = item.path.split('/');
      return parts[parts.length - 1]?.toLowerCase() ?? '';
    })
  );

  // Runtimes detection
  const runtimes: string[] = [];
  if (
    fileNames.has('tsconfig.json') ||
    treeItems.some((i) => i.path.endsWith('.ts') || i.path.endsWith('.tsx'))
  ) {
    runtimes.push('TypeScript');
  }
  if (fileNames.has('package.json')) {
    runtimes.push('Node.js');
  }
  if (
    fileNames.has('pyproject.toml') ||
    fileNames.has('requirements.txt') ||
    fileNames.has('setup.py') ||
    fileNames.has('poetry.lock') ||
    fileNames.has('pipfile')
  ) {
    runtimes.push('Python');
  }
  if (fileNames.has('go.mod') || fileNames.has('go.sum')) {
    runtimes.push('Go');
  }
  if (fileNames.has('cargo.toml') || fileNames.has('cargo.lock')) {
    runtimes.push('Rust');
  }

  // Package manager detection
  let packageManager: string | undefined;
  if (fileNames.has('pnpm-lock.yaml')) {
    packageManager = 'pnpm';
  } else if (fileNames.has('yarn.lock')) {
    packageManager = 'yarn';
  } else if (fileNames.has('bun.lockb') || fileNames.has('bun.lock')) {
    packageManager = 'bun';
  } else if (fileNames.has('package-lock.json')) {
    packageManager = 'npm';
  } else if (fileNames.has('cargo.lock')) {
    packageManager = 'cargo';
  } else if (fileNames.has('poetry.lock')) {
    packageManager = 'poetry';
  } else if (fileNames.has('pipfile.lock')) {
    packageManager = 'pipenv';
  }

  // Frameworks & Libraries detection
  const frameworks: string[] = [];
  if (
    fileNames.has('next.config.js') ||
    fileNames.has('next.config.mjs') ||
    fileNames.has('next.config.ts')
  ) {
    frameworks.push('Next.js');
  }
  if (fileNames.has('nuxt.config.js') || fileNames.has('nuxt.config.ts')) {
    frameworks.push('Nuxt');
  }
  if (fileNames.has('astro.config.mjs') || fileNames.has('astro.config.ts')) {
    frameworks.push('Astro');
  }
  if (fileNames.has('svelte.config.js') || fileNames.has('svelte.config.ts')) {
    frameworks.push('Svelte');
  }
  if (fileNames.has('angular.json')) {
    frameworks.push('Angular');
  }
  if (fileNames.has('tailwind.config.js') || fileNames.has('tailwind.config.ts')) {
    frameworks.push('Tailwind CSS');
  }

  // Build tools, testing & linters
  const buildTools: string[] = [];
  if (
    fileNames.has('vite.config.ts') ||
    fileNames.has('vite.config.js') ||
    fileNames.has('vite.config.mjs')
  ) {
    buildTools.push('Vite');
  }
  if (fileNames.has('tsup.config.ts') || fileNames.has('tsup.config.js')) {
    buildTools.push('tsup');
  }
  if (fileNames.has('vitest.config.ts') || fileNames.has('vitest.config.js')) {
    buildTools.push('Vitest');
  }
  if (fileNames.has('jest.config.js') || fileNames.has('jest.config.ts')) {
    buildTools.push('Jest');
  }
  if (fileNames.has('biome.json') || fileNames.has('biome.jsonc')) {
    buildTools.push('Biome');
  }
  if (
    Array.from(fileNames).some((f) => f.startsWith('.eslintrc') || f.startsWith('eslint.config.'))
  ) {
    buildTools.push('ESLint');
  }

  // CI/CD workflows from .github/workflows/
  const ciWorkflows: string[] = [];
  for (const item of treeItems) {
    if (
      item.path.startsWith('.github/workflows/') &&
      (item.path.endsWith('.yml') || item.path.endsWith('.yaml'))
    ) {
      const fileName = item.path.replace('.github/workflows/', '');
      ciWorkflows.push(fileName);
    }
  }

  // Docker / Containers
  const hasDocker =
    fileNames.has('dockerfile') ||
    fileNames.has('docker-compose.yml') ||
    fileNames.has('docker-compose.yaml') ||
    fileNames.has('compose.yaml') ||
    fileNames.has('compose.yml');

  return {
    runtimes,
    packageManager,
    frameworks,
    buildTools,
    ciWorkflows,
    hasDocker,
  };
}

export class StackAnalyzer implements Analyzer<DetectedTechStack> {
  public readonly name = 'stack';
  private readonly client: GitHubClient;
  private readonly defaultBranch: string;

  constructor(client: GitHubClient, defaultBranch: string = 'HEAD') {
    this.client = client;
    this.defaultBranch = defaultBranch;
  }

  public async analyze(repo: RepoIdentifier): Promise<DetectedTechStack> {
    try {
      const { data: treeResponse } = await this.client.getTree(
        repo.owner,
        repo.name,
        this.defaultBranch,
        true
      );
      return detectTechStackFromTree(treeResponse.tree);
    } catch {
      // Graceful fallback if tree cannot be traversed (e.g. empty or shallow)
      return {
        runtimes: [],
        frameworks: [],
        buildTools: [],
        ciWorkflows: [],
        hasDocker: false,
      };
    }
  }
}
