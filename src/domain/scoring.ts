import { HealthGrade, HygieneCheckItem, HygieneResult } from './models.js';

/**
 * Maps a numeric score (0–100) to an industry-standard health grade.
 */
export function calculateHealthGrade(score: number): HealthGrade {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));

  if (normalized >= 95) return 'A+';
  if (normalized >= 85) return 'A';
  if (normalized >= 70) return 'B';
  if (normalized >= 55) return 'C';
  if (normalized >= 40) return 'D';
  return 'F';
}

/**
 * Standardized weights for repository hygiene checks.
 * Sum must equal 100.
 */
export const HYGIENE_WEIGHTS = {
  LICENSE: 35,
  README: 30,
  SECURITY: 20,
  CONTRIBUTING: 10,
  CODE_OF_CONDUCT: 5,
} as const;

/**
 * Calculates the overall hygiene score and assigned grade based on verified checklist items.
 */
export function calculateHygieneScore(checks: readonly HygieneCheckItem[]): HygieneResult {
  if (checks.length === 0) {
    return {
      score: 0,
      grade: 'F',
      checks: [],
    };
  }

  const totalPossibleWeight = checks.reduce((sum, item) => sum + item.weight, 0);
  if (totalPossibleWeight === 0) {
    return {
      score: 0,
      grade: 'F',
      checks,
    };
  }

  const achievedWeight = checks
    .filter((item) => item.found)
    .reduce((sum, item) => sum + item.weight, 0);

  const rawScore = (achievedWeight / totalPossibleWeight) * 100;
  const score = Math.round(rawScore);
  const grade = calculateHealthGrade(score);

  return {
    score,
    grade,
    checks,
  };
}
