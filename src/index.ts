import type { AuditReport, RepoIdentifier } from './domain/models.js';
import { AuditService, type AuditServiceOptions } from './service/audit.service.js';

// Analyzers
export * from './analyzers/activity.analyzer.js';
export * from './analyzers/analyzer.interface.js';
export * from './analyzers/bus-factor.analyzer.js';
export * from './analyzers/hygiene.analyzer.js';
export * from './analyzers/language.analyzer.js';
export * from './analyzers/stack.analyzer.js';
export * from './domain/errors.js';
// Domain models & functions
export * from './domain/models.js';
export * from './domain/scoring.js';
export * from './formatters/json.formatter.js';
// Formatters
export * from './formatters/terminal.formatter.js';
// Infrastructure
export * from './infrastructure/cache/cache.interface.js';
export * from './infrastructure/cache/memory-cache.js';
export * from './infrastructure/github/client.js';
export * from './infrastructure/github/token.js';
export * from './infrastructure/github/types.js';

// Service
export * from './service/audit.service.js';

/**
 * Primary programmatic function to vet a GitHub repository.
 */
export async function vetRepo(
  target: string | RepoIdentifier,
  options?: AuditServiceOptions
): Promise<AuditReport> {
  const service = new AuditService(options);
  return service.audit(target);
}

/**
 * Backward-compatible alias for vetRepo.
 */
export const auditRepo = vetRepo;
