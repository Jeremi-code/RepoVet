import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectTechStackFromTree, StackAnalyzer } from '../../src/analyzers/stack.analyzer.js';
import type { GitHubClient } from '../../src/infrastructure/github/client.js';
import type { GitHubGitTreeResponse } from '../../src/infrastructure/github/types.js';

describe('StackAnalyzer & detectTechStackFromTree', () => {
  const reactTree = JSON.parse(
    readFileSync(resolve(__dirname, '../fixtures/tree-react.json'), 'utf-8')
  ) as GitHubGitTreeResponse;

  it('detects Node.js, TypeScript, yarn, and CI workflows from React tree', () => {
    const stack = detectTechStackFromTree(reactTree.tree);

    expect(stack.runtimes).toContain('Node.js');
    expect(stack.runtimes).toContain('TypeScript');
    expect(stack.packageManager).toBe('yarn');
    expect(stack.ciWorkflows).toContain('runtime.yml');
    expect(stack.ciWorkflows).toContain('release.yml');
    expect(stack.hasDocker).toBe(false);
  });

  it('detects Python stack with Poetry and Docker', () => {
    const pythonTree = [
      { path: 'pyproject.toml', mode: '100644', type: 'blob' as const, sha: '1', url: '' },
      { path: 'poetry.lock', mode: '100644', type: 'blob' as const, sha: '2', url: '' },
      { path: 'Dockerfile', mode: '100644', type: 'blob' as const, sha: '3', url: '' },
      { path: 'docker-compose.yml', mode: '100644', type: 'blob' as const, sha: '4', url: '' },
    ];

    const stack = detectTechStackFromTree(pythonTree);

    expect(stack.runtimes).toContain('Python');
    expect(stack.packageManager).toBe('poetry');
    expect(stack.hasDocker).toBe(true);
  });

  it('detects Go stack', () => {
    const goTree = [
      { path: 'go.mod', mode: '100644', type: 'blob' as const, sha: '1', url: '' },
      { path: 'go.sum', mode: '100644', type: 'blob' as const, sha: '2', url: '' },
      { path: 'main.go', mode: '100644', type: 'blob' as const, sha: '3', url: '' },
    ];

    const stack = detectTechStackFromTree(goTree);

    expect(stack.runtimes).toContain('Go');
    expect(stack.hasDocker).toBe(false);
  });

  it('detects Rust stack with Cargo', () => {
    const rustTree = [
      { path: 'Cargo.toml', mode: '100644', type: 'blob' as const, sha: '1', url: '' },
      { path: 'Cargo.lock', mode: '100644', type: 'blob' as const, sha: '2', url: '' },
    ];

    const stack = detectTechStackFromTree(rustTree);

    expect(stack.runtimes).toContain('Rust');
    expect(stack.packageManager).toBe('cargo');
  });

  it('detects frameworks and build tools', () => {
    const modernWebTree = [
      { path: 'package.json', mode: '100644', type: 'blob' as const, sha: '1', url: '' },
      { path: 'pnpm-lock.yaml', mode: '100644', type: 'blob' as const, sha: '2', url: '' },
      { path: 'next.config.ts', mode: '100644', type: 'blob' as const, sha: '3', url: '' },
      { path: 'tailwind.config.ts', mode: '100644', type: 'blob' as const, sha: '4', url: '' },
      { path: 'biome.json', mode: '100644', type: 'blob' as const, sha: '5', url: '' },
      { path: 'vitest.config.ts', mode: '100644', type: 'blob' as const, sha: '6', url: '' },
    ];

    const stack = detectTechStackFromTree(modernWebTree);

    expect(stack.packageManager).toBe('pnpm');
    expect(stack.frameworks).toContain('Next.js');
    expect(stack.frameworks).toContain('Tailwind CSS');
    expect(stack.buildTools).toContain('Biome');
    expect(stack.buildTools).toContain('Vitest');
  });

  it('handles client failure gracefully', async () => {
    const mockClient = {
      getTree: async () => {
        throw new Error('API Rate Limit or Tree Not Found');
      },
    } as unknown as GitHubClient;

    const analyzer = new StackAnalyzer(mockClient);
    const stack = await analyzer.analyze({ owner: 'unknown', name: 'missing' });

    expect(stack.runtimes).toEqual([]);
    expect(stack.frameworks).toEqual([]);
    expect(stack.hasDocker).toBe(false);
  });
});
