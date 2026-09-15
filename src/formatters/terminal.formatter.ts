import chalk from 'chalk';
import Table from 'cli-table3';
import { AuditReport, HealthGrade } from '../domain/models.js';

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

function renderScoreMeter(score: number): string {
  const totalBars = 20;
  const filledBars = Math.round((score / 100) * totalBars);
  const emptyBars = totalBars - filledBars;

  let color = chalk.red;
  if (score >= 85) color = chalk.green;
  else if (score >= 70) color = chalk.cyan;
  else if (score >= 55) color = chalk.yellow;

  const bar = color('█'.repeat(filledBars)) + chalk.gray('░'.repeat(emptyBars));
  return `[${bar}] ${color.bold(`${score}/100`)}`;
}

export function formatTerminalReport(report: AuditReport): string {
  const lines: string[] = [];

  // Header Banner
  lines.push('');
  lines.push(
    chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════╗')
  );
  lines.push(
    chalk.bold.cyan('║') +
      chalk.bold.white(`  RepoAudit: ${report.repo.owner}/${report.repo.name}`.padEnd(63)) +
      chalk.bold.cyan('║')
  );
  lines.push(
    chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝')
  );
  lines.push('');

  // Overview info
  const meta = report.metadata;
  const desc = meta.description ? chalk.italic(meta.description) : chalk.gray('No description provided.');
  lines.push(desc);
  lines.push('');

  const stats = [
    `${chalk.yellow('★')} ${meta.stars.toLocaleString()} stars`,
    `${chalk.blue('⑂')} ${meta.forks.toLocaleString()} forks`,
    `${chalk.magenta('☉')} ${meta.openIssues.toLocaleString()} open issues`,
    `${chalk.green('⚖')} ${meta.license ?? 'No license'}`,
    report.fromCache ? chalk.dim('(cached)') : chalk.dim('(live)'),
  ];
  lines.push(stats.join(chalk.gray('  |  ')));
  lines.push('');

  // Overall Health Score
  lines.push(
    `${chalk.bold('Overall Hygiene Score:')} ${renderScoreMeter(report.hygiene.score)}  ${renderGradeBadge(
      report.hygiene.grade
    )}`
  );
  lines.push('');

  // Checklist Table
  const table = new Table({
    head: [
      chalk.white.bold('Status'),
      chalk.white.bold('Check Item'),
      chalk.white.bold('Weight'),
      chalk.white.bold('Importance'),
    ],
    colWidths: [12, 38, 10, 15],
    style: { head: [], border: ['gray'] },
  });

  for (const item of report.hygiene.checks) {
    const status = item.found
      ? chalk.green.bold('  ✓ PASS ')
      : chalk.red.bold('  ✗ FAIL ');

    const importanceLabel =
      item.importance === 'critical'
        ? chalk.red('Critical')
        : item.importance === 'recommended'
        ? chalk.yellow('Recommended')
        : chalk.gray('Optional');

    table.push([
      status,
      item.name,
      `${item.weight} pts`,
      importanceLabel,
    ]);
  }

  lines.push(table.toString());
  lines.push('');

  // Actionable recommendations
  const missingItems = report.hygiene.checks.filter((c) => !c.found);
  if (missingItems.length > 0) {
    lines.push(chalk.bold.yellow('⚡ Actionable Recommendations:'));
    for (const item of missingItems) {
      const prefix = item.importance === 'critical' ? chalk.red('(!)') : chalk.yellow('(-)');
      lines.push(`  ${prefix} Add ${chalk.bold(item.name)}: ${chalk.gray(item.description)}`);
    }
    lines.push('');
  } else {
    lines.push(chalk.green('✔ Excellent! All standard open-source hygiene checks passed.'));
    lines.push('');
  }

  return lines.join('\n');
}
