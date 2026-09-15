import { AuditReport } from '../domain/models.js';

export function formatJsonReport(report: AuditReport): string {
  return JSON.stringify(report, null, 2);
}
