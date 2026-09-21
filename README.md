# 🔍 repovet

> **Zero-clone, polyglot GitHub repository profiler and adoption vetting tool.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green?logo=node.js)](https://nodejs.org/)
[![Vitest](https://img.shields.io/badge/tested%20with-vitest-yellow?logo=vitest)](https://vitest.dev/)

Engineers and tech leads constantly evaluate whether an open-source library is active, healthy, and safe to adopt into production. `repovet` performs deep diagnostics on remote GitHub repositories in seconds—**without cloning gigabytes of git history to your disk**.

---

## ⚡ Quick Start

You can run `repovet` instantly without installation:

```bash
# Run via npx
npx repovet facebook/react

# Also available as repo-vet
npx repo-vet facebook/react

# Or with full repository URL
npx repovet https://github.com/vercel/next.js
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

```bash
# Basic terminal audit with gauges and checklist
repovet expressjs/express

# Output machine-readable JSON for CI/CD or piping to jq
repovet expressjs/express --json

# Provide an authenticated GitHub token (raises rate-limit to 5,000 req/hr)
repovet expressjs/express --token ghp_yourPersonalAccessToken
# or export REPO_VET_TOKEN=ghp_... (or GITHUB_TOKEN=ghp_...)
```

### Sample Terminal Output

```text
╔═══════════════════════════════════════════════════════════════╗
║  RepoVet: facebook/react                                      ║
╚═══════════════════════════════════════════════════════════════╝

The library for web and native user interfaces.

★ 250,469 stars  |  ⑂ 51,349 forks  |  ☉ 1,374 open issues  |  ⚖ MIT  |  (live)

Overall Hygiene Score: [████████████████░░░░] 80/100    B  

┌────────────┬──────────────────────────────────────┬──────────┬───────────────┐
│ Status     │ Check Item                           │ Weight   │ Importance    │
├────────────┼──────────────────────────────────────┼──────────┼───────────────┤
│   ✓ PASS   │ Open Source License                  │ 35 pts   │ Critical      │
├────────────┼──────────────────────────────────────┼──────────┼───────────────┤
│   ✓ PASS   │ README Documentation                 │ 30 pts   │ Critical      │
├────────────┼──────────────────────────────────────┼──────────┼───────────────┤
│   ✗ FAIL   │ Security Policy (SECURITY.md)        │ 20 pts   │ Recommended   │
├────────────┼──────────────────────────────────────┼──────────┼───────────────┤
│   ✓ PASS   │ Contributing Guide (CONTRIBUTING.md) │ 10 pts   │ Recommended   │
├────────────┼──────────────────────────────────────┼──────────┼───────────────┤
│   ✓ PASS   │ Code of Conduct (CODE_OF_CONDUCT.md) │ 5 pts    │ Optional      │
└────────────┴──────────────────────────────────────┴──────────┴───────────────┘

⚡ Actionable Recommendations:
  (-) Add Security Policy (SECURITY.md): Instructions on how to responsibly disclose vulnerabilities.
```

---

## 📦 Programmatic SDK Usage

`repovet` is also a fully typed TypeScript library:

```typescript
import { vetRepo } from 'repovet';

const report = await vetRepo('facebook/react');

console.log(`Health Grade: ${report.hygiene.grade}`);
console.log(`Score: ${report.hygiene.score}/100`);

for (const check of report.hygiene.checks) {
  console.log(`${check.name}: ${check.found ? 'PASSED' : 'FAILED'}`);
}
```

---

## 🏛️ Architecture & Design Principles

This project is built under strict software engineering principles to ensure maintainability, resilience, and determinism:

* **Clean Domain Layer:** Business logic and scoring formulas (`src/domain/`) have **zero external dependencies** and are 100% deterministically unit-tested.
* **Resilient Infrastructure:**
  * **HTTP 304 ETag Caching:** Automatically tracks HTTP ETags; repeated queries consume 0 rate-limit quota.
  * **Typed Error Hierarchy:** Custom error classes (`RateLimitExceededError`, `RepositoryNotFoundError`, `InvalidRepoIdentifierError`, `NetworkError`) with exit code mapping and actionable hints.
  * **Strict TypeScript:** Configured with `strict: true`, `noImplicitAny: true`, and `exactOptionalPropertyTypes: true`.
* **Zero-Network Unit Tests:** Vitest suites run against recorded API fixtures (`tests/fixtures/`) ensuring fast, reliable CI test execution without flaky network calls.

---

## 🗺️ Roadmap & Releases

- [x] **v1.0.0 (Released)**: Core engine, resilient GitHub API client with ETag cache, Hygiene Analyzer, rich terminal & JSON formatters, CLI entrypoint, and unit test suite.
- [x] **v1.1.0 (Released)**: Zero-clone Git Trees analyzer, polyglot stack detector (`package.json`, `go.mod`, `Cargo.toml`, `pyproject.toml`, Docker), and language composition breakdown.
- [x] **v1.2.0 (Current)**: Bus factor calculation via Gini coefficient, commit velocity metrics, and weighted composite Health Score (0–100).
- [ ] **v1.3.0**: Multi-repo side-by-side battle mode (`repovet compare repoA repoB`), Markdown report exporter, and `--min-score` CI quality gate.

---

## 🧪 Development

```bash
# Install dependencies
pnpm install

# Run unit tests
pnpm test

# Typecheck source code
pnpm typecheck

# Build library and CLI bundles
pnpm build
```

---

## 📄 License

MIT © 2026 Jeremiah
