import { AuditReport, RepoIdentifier } from './domain/models.js';
import { AuditService, AuditServiceOptions } from './service/audit.service.js';

// Domain models & functions
export * from './domain/models.js';
export * from './domain/errors.js';
export * from './domain/scoring.js';

// Infrastructure
export * from './infrastructure/cache/cache.interface.js';
export * from './infrastructure/cache/memory-cache.js';
export * from './infrastructure/github/types.js';
export * from './infrastructure/github/token.js';
export * from './infrastructure/github/client.js';

// Analyzers
export * from './analyzers/analyzer.interface.js';
export * from './analyzers/hygiene.analyzer.js';

// Formatters
export * from './formatters/terminal.formatter.js';
export * from './formatters/json.formatter.js';

// Service
export * from './service/audit.service.js';

/**
 * Convenience function to audit a GitHub repository programmatically.
 */
export async function auditRepo(
  target: string | RepoIdentifier,
  options?: AuditServiceOptions
): Promise<AuditReport> {
  const service = new AuditService(options);
  return service.audit(target);
}
