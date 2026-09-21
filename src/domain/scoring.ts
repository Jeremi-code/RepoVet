import type {
  BusFactorRisk,
  HealthGrade,
  HealthScoreBreakdown,
  HygieneCheckItem,
  HygieneResult,
} from './models.js';

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

/**
 * Computes the Gini coefficient for contributor commit distribution.
 * 0.00 = perfect equality across contributors
 * 1.00 = complete monopoly (a single contributor authored all commits)
 */
export function calculateGiniCoefficient(contributions: readonly number[]): number {
  if (contributions.length <= 1) {
    const first = contributions[0];
    return contributions.length === 1 && typeof first === 'number' && first > 0 ? 1 : 0;
  }

  const sorted = [...contributions].sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return 0;
  }

  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    const val = sorted[i] ?? 0;
    weightedSum += (i + 1) * val;
  }

  const gini = (2 * weightedSum) / (n * total) - (n + 1) / n;
  return Number(Math.max(0, Math.min(1, gini)).toFixed(2));
}

/**
 * Calculates the repository's Bus Factor:
 * The minimum number of top contributors who account for >= 50% of all contributions.
 */
export function calculateBusFactor(contributions: readonly number[]): {
  busFactor: number;
  risk: BusFactorRisk;
} {
  if (contributions.length === 0) {
    return { busFactor: 0, risk: 'high' };
  }

  const sorted = [...contributions].sort((a, b) => b - a);
  const total = sorted.reduce((sum, val) => sum + val, 0);

  if (total === 0) {
    return { busFactor: 0, risk: 'high' };
  }

  const threshold = total * 0.5;
  let accumulated = 0;
  let busFactor = 0;

  for (const count of sorted) {
    accumulated += count;
    busFactor++;
    if (accumulated >= threshold) {
      break;
    }
  }

  let risk: BusFactorRisk = 'healthy';
  if (busFactor <= 1) {
    risk = 'high';
  } else if (busFactor <= 3) {
    risk = 'moderate';
  }

  return { busFactor, risk };
}

/**
 * Computes contributor bus factor score (0–100) based on bus factor and Gini coefficient.
 */
export function calculateBusFactorScore(busFactor: number, gini: number): number {
  if (busFactor === 0) return 0;

  let baseScore = 25;
  if (busFactor >= 5) {
    baseScore = 100;
  } else if (busFactor >= 4) {
    baseScore = 85;
  } else if (busFactor === 3) {
    baseScore = 70;
  } else if (busFactor === 2) {
    baseScore = 50;
  }

  // Penalty if distribution is highly unequal despite multiple contributors
  if (gini > 0.85 && busFactor > 1) {
    baseScore = Math.max(25, baseScore - 15);
  }

  return baseScore;
}

/**
 * Computes repository activity and velocity score (0–100) based on push recency and commit counts.
 */
export function calculateActivityScore(
  pushedAt: string,
  commits30d: number,
  commits90d: number,
  now: Date = new Date()
): number {
  const pushDate = new Date(pushedAt);
  const daysAgo = Math.max(
    0,
    Math.floor((now.getTime() - pushDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Recency score (max 50 pts)
  let recencyScore = 0;
  if (daysAgo < 7) {
    recencyScore = 50;
  } else if (daysAgo < 30) {
    recencyScore = 40;
  } else if (daysAgo < 90) {
    recencyScore = 25;
  } else if (daysAgo < 180) {
    recencyScore = 10;
  } else {
    recencyScore = 0;
  }

  // Velocity score (max 50 pts)
  let velocityScore = 0;
  if (commits30d >= 20) {
    velocityScore += 30;
  } else if (commits30d >= 5) {
    velocityScore += 20;
  } else if (commits30d >= 1) {
    velocityScore += 10;
  }

  if (commits90d >= 50) {
    velocityScore += 20;
  } else if (commits90d >= 15) {
    velocityScore += 15;
  } else if (commits90d >= 3) {
    velocityScore += 10;
  }

  return Math.min(100, Math.max(0, recencyScore + velocityScore));
}

/**
 * Weights for Composite Health Score calculation:
 * - Hygiene: 40% (Community standards, security, licensing)
 * - Maintenance Activity: 35% (Commit velocity and freshness)
 * - Bus Factor: 25% (Community breadth and centralization risk)
 */
export const COMPOSITE_WEIGHTS = {
  HYGIENE: 0.4,
  ACTIVITY: 0.35,
  BUS_FACTOR: 0.25,
} as const;

/**
 * Calculates the comprehensive composite health score and overall letter grade.
 */
export function calculateCompositeHealthScore(
  hygieneScore: number,
  activityScore: number,
  busFactorScore: number
): HealthScoreBreakdown {
  const composite = Math.round(
    hygieneScore * COMPOSITE_WEIGHTS.HYGIENE +
      activityScore * COMPOSITE_WEIGHTS.ACTIVITY +
      busFactorScore * COMPOSITE_WEIGHTS.BUS_FACTOR
  );

  const compositeScore = Math.min(100, Math.max(0, composite));
  const grade = calculateHealthGrade(compositeScore);

  return {
    hygieneScore,
    activityScore,
    busFactorScore,
    compositeScore,
    grade,
  };
}
