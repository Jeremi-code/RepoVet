import chalk from 'chalk';
import Table from 'cli-table3';
import type { ComparisonReport, HealthGrade } from '../domain/models.js';

function renderGradeBadge(grade: HealthGrade): string {
  switch (grade) {
    case 'A+':
      return chalk.bgGreen.black.bold(' A+ ');
    case 'A':
      return chalk.bgGreen.black.bold('  A  ');
    case 'B':
      return chalk.bgBlue.black.bold('  B  ');
    case 'C':
      return chalk.bgYellow.black.bold('  C  ');
    case 'D':
      return chalk.bgHex('#FF8C00').black.bold('  D  ');
    case 'F':
      return chalk.bgRed.white.bold('  F  ');
  }
}

export function formatTerminalComparisonReport(comparison: ComparisonReport): string {
  const lines: string[] = [];
  const reports = comparison.reports;

  lines.push('');
  lines.push(chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════╗'));
  lines.push(
    chalk.bold.cyan('║') +
      chalk.bold.white('  RepoVet: Multi-Repository Comparison Battle Mode             ') +
      chalk.bold.cyan('║')
  );
  lines.push(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝'));
  lines.push('');

  const table = new Table({
    head: [
      chalk.white.bold('Metric / Indicator'),
      ...reports.map((r) => chalk.bold.cyan(`${r.repo.owner}/${r.repo.name}`)),
    ],
    style: { head: [], border: ['gray'] },
  });

  // 1. Overall Health Score
  table.push([
    chalk.bold('Health Score'),
    ...reports.map(
      (r) =>
        `${renderGradeBadge(r.healthScore.grade)} ${chalk.bold(`${r.healthScore.compositeScore}/100`)}`
    ),
  ]);

  // 2. Hygiene Score
  table.push(['Hygiene Score', ...reports.map((r) => `${r.hygiene.score}/100`)]);

  // 3. Maintenance Status
  table.push([
    'Activity Status',
    ...reports.map((r) =>
      r.activity.isStale ? chalk.red.bold('STALE') : chalk.green.bold('ACTIVE')
    ),
  ]);

  // 4. Recency
  table.push([
    'Last Push',
    ...reports.map((r) =>
      r.activity.lastPushedDaysAgo === 0 ? 'Today' : `${r.activity.lastPushedDaysAgo}d ago`
    ),
  ]);

  // 5. Commits Last 30d
  table.push([
    'Commits (30d)',
    ...reports.map((r) => r.activity.commitsLast30Days.toLocaleString()),
  ]);

  // 6. Commits Last 90d
  table.push([
    'Commits (90d)',
    ...reports.map((r) => r.activity.commitsLast90Days.toLocaleString()),
  ]);

  // 7. Bus Factor & Risk
  table.push([
    'Bus Factor',
    ...reports.map((r) => {
      const color =
        r.busFactor.risk === 'healthy'
          ? chalk.green
          : r.busFactor.risk === 'moderate'
            ? chalk.yellow
            : chalk.red;
      return `${color.bold(r.busFactor.busFactor.toString())} (${r.busFactor.risk})`;
    }),
  ]);

  // 8. Gini Inequality Index
  table.push(['Gini Inequality', ...reports.map((r) => r.busFactor.giniCoefficient.toFixed(2))]);

  // 9. Stars
  table.push([
    'Stars',
    ...reports.map((r) => `${chalk.yellow('★')} ${r.metadata.stars.toLocaleString()}`),
  ]);

  // 10. Forks
  table.push([
    'Forks',
    ...reports.map((r) => `${chalk.blue('⑂')} ${r.metadata.forks.toLocaleString()}`),
  ]);

  // 11. Open Issues
  table.push(['Open Issues', ...reports.map((r) => r.metadata.openIssues.toLocaleString())]);

  // 12. License
  table.push(['License', ...reports.map((r) => r.metadata.license ?? chalk.gray('None'))]);

  // 13. Top Language
  table.push([
    'Top Language',
    ...reports.map((r) => r.languages[0]?.name ?? chalk.gray('Unknown')),
  ]);

  // 14. Primary Frameworks
  table.push([
    'Frameworks',
    ...reports.map((r) =>
      r.stack.frameworks.length > 0 ? r.stack.frameworks.slice(0, 2).join(', ') : chalk.gray('None')
    ),
  ]);

  lines.push(table.toString());
  lines.push('');

  // Winner Announcement
  if (comparison.winner) {
    const w = comparison.winner;
    lines.push(chalk.bold.yellow('🏆 Top Pick / Winner:'));
    lines.push(
      `  ${chalk.bold.green(`${w.repo.owner}/${w.repo.name}`)}  ${renderGradeBadge(w.grade)}  ${chalk.bold(
        `Score: ${w.score}/100`
      )}`
    );
    lines.push(chalk.bold('  Key Advantages:'));
    for (const reason of w.reasons) {
      lines.push(`    • ${chalk.white(reason)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
