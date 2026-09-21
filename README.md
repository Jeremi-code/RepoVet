# 🔍 repovet

> **Zero-clone, polyglot GitHub repository profiler, health auditor, and battle-mode comparison tool.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green?logo=node.js)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-yellow?logo=vitest)](https://vitest.dev/)

Engineers and tech leads constantly evaluate whether an open-source library is active, healthy, and safe to adopt into production. `repovet` performs deep diagnostics on remote GitHub repositories in seconds—**without cloning gigabytes of git history to your disk**.

---

## ⚡ Quick Start

You can run `repovet` instantly without installation:

```bash
# Run single repo audit
npx repovet facebook/react

# Also available as repo-vet
npx repo-vet facebook/react

# Compare repositories in Battle Mode
npx repovet compare facebook/react vuejs/core sveltejs/svelte

# Generate clean GitHub Flavored Markdown (perfect for $GITHUB_STEP_SUMMARY)
npx repovet facebook/react --markdown

# Enforce a CI quality gate
npx repovet facebook/react --min-score 80
```

Or install it globally:

```bash
# Using pnpm (recommended)
pnpm add -g repovet

# Using npm
npm install -g repovet
```

---

## 🖥️ CLI Usage

### 1. Single Repository Audit

```bash
# Rich interactive terminal report
repovet expressjs/express

# Output machine-readable JSON for CI/CD or piping to jq
repovet expressjs/express --json

# Output GitHub-Flavored Markdown for PR comments or ADR docs
repovet expressjs/express --markdown

# Enforce minimum health score (exits with code 1 if threshold is not met)
repovet expressjs/express --min-score 75

# Authenticated token (raises GitHub rate-limit to 5,000 req/hr)
repovet expressjs/express --token ghp_yourPersonalAccessToken
# or export REPO_VET_TOKEN=ghp_... (or GITHUB_TOKEN=ghp_...)
```

### 2. Multi-Repo "Battle Mode" Comparison

Compare two or more competing libraries side-by-side:

```bash
# Compare multiple repos side-by-side in terminal
repovet compare facebook/react vuejs/core

# Compare in GitHub-Flavored Markdown table
repovet compare facebook/react vuejs/core --markdown

# Export comparison matrix as JSON
repovet compare facebook/react vuejs/core --json
```

---

## 🚦 CI/CD Quality Gate Example

Add `repovet` to your GitHub Actions workflow to block PRs or monitor project health:

```yaml
name: Repository Health Check

on:
  push:
    branches: [main]
  pull_request:

jobs:
  vet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Vet Repository Quality Gate
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          npx repovet ${{ github.repository }} --min-score 70 --markdown >> $GITHUB_STEP_SUMMARY
```

---

## 📦 Programmatic SDK Usage

`repovet` is fully typed and can be integrated into custom Node.js/TypeScript tooling:

```typescript
import { vetRepo, compareRepos } from 'repovet';

// 1. Audit a single repository
const report = await vetRepo('facebook/react');
console.log(`Composite Health Score: ${report.healthScore.compositeScore}/100`);
console.log(`Bus Factor: ${report.busFactor.busFactor} (${report.busFactor.risk})`);

// 2. Battle Mode: Compare repositories
const comparison = await compareRepos(['facebook/react', 'vuejs/core']);
console.log(`Winner: ${comparison.winner?.repo.owner}/${comparison.winner?.repo.name}`);
console.log(`Winning Score: ${comparison.winner?.score}`);
```

---

## 🏛️ Architecture & Key Features

* **Zero-Clone Remote Profiling:** Queries GitHub REST endpoints concurrently in-memory without disk or network cloning overhead.
* **Bus Factor & Contributor Risk:** Measures contributor commit concentration and Gini inequality index to detect single-point-of-failure projects.
* **Commit Velocity & Staleness:** Analyzes rolling 30-day and 90-day activity trends to identify abandoned or active packages.
* **Weighted Composite Scoring:** Transparent, mathematically bounded formula combining community hygiene (40%), maintenance velocity (35%), and contributor bus factor resilience (25%).
* **HTTP 304 ETag Caching:** Preserves rate-limit quota across executions with automatic ETag tracking.

---

## 🗺️ Roadmap & Releases

- [x] **v1.0.0**: Core engine, GitHub client with ETag cache, Hygiene Analyzer, terminal & JSON formatters, CLI entrypoint.
- [x] **v1.1.0**: Zero-clone Git Trees analyzer, polyglot stack detector (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, Docker), language breakdown.
- [x] **v1.2.0**: Contributor Bus Factor via Gini coefficient, commit velocity metrics, and composite Health Score (0–100).
- [x] **v1.3.0**: Multi-repo comparison Battle Mode (`repovet compare`), Markdown report exporter (`--markdown`), and CI quality gate (`--min-score`).

---

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Typecheck source code
pnpm typecheck

# Code quality check & format
pnpm check
pnpm format

# Build library and CLI bundles
pnpm build
```

---

## 📄 License

MIT © 2026 Jeremiah
