import chalk from 'chalk';
import Table from 'cli-table3';
import type { AuditReport, BusFactorRisk, HealthGrade } from '../domain/models.js';

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

function renderRiskBadge(risk: BusFactorRisk): string {
  switch (risk) {
    case 'high':
      return chalk.bgRed.white.bold(' HIGH RISK ');
    case 'moderate':
      return chalk.bgYellow.black.bold(' MODERATE RISK ');
    case 'healthy':
      return chalk.bgGreen.black.bold(' HEALTHY ');
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
  lines.push(chalk.bold.cyan('╔═══════════════════════════════════════════════════════════════╗'));
  lines.push(
    chalk.bold.cyan('║') +
      chalk.bold.white(`  RepoVet: ${report.repo.owner}/${report.repo.name}`.padEnd(63)) +
      chalk.bold.cyan('║')
  );
  lines.push(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════════╝'));
  lines.push('');

  // Overview info
  const meta = report.metadata;
  const desc = meta.description
    ? chalk.italic(meta.description)
    : chalk.gray('No description provided.');
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

  // Language Breakdown
  if (report.languages.length > 0) {
    const topLangs = report.languages.slice(0, 5);
    const summary = topLangs
      .map((l) => `${chalk.bold.cyan(l.name)} ${chalk.gray(`${l.percentage}%`)}`)
      .join(chalk.gray('  ·  '));
    lines.push(`${chalk.bold('Languages:')} ${summary}`);
    lines.push('');
  }

  // Tech Stack & Tooling
  const stack = report.stack;
  const stackItems: string[] = [];
  if (stack.runtimes.length > 0) {
    stackItems.push(
      `${chalk.bold('Runtimes:')} ${stack.runtimes.map((r) => chalk.cyan(r)).join(', ')}`
    );
  }
  if (stack.packageManager) {
    stackItems.push(`${chalk.bold('Package Manager:')} ${chalk.green(stack.packageManager)}`);
  }
  if (stack.frameworks.length > 0) {
    stackItems.push(
      `${chalk.bold('Frameworks:')} ${stack.frameworks.map((f) => chalk.magenta(f)).join(', ')}`
    );
  }
  if (stack.buildTools.length > 0) {
    stackItems.push(
      `${chalk.bold('Tooling:')} ${stack.buildTools.map((t) => chalk.blue(t)).join(', ')}`
    );
  }
  if (stack.hasDocker) {
    stackItems.push(`${chalk.bold('Containers:')} ${chalk.blue('Docker')}`);
  }
  if (stack.ciWorkflows.length > 0) {
    stackItems.push(
      `${chalk.bold('CI/CD:')} ${stack.ciWorkflows.map((w) => chalk.yellow(w)).join(', ')}`
    );
  }

  if (stackItems.length > 0) {
    lines.push(chalk.bold('Tech Stack & Infrastructure:'));
    for (const item of stackItems) {
      lines.push(`  • ${item}`);
    }
    lines.push('');
  }

  // Maintenance & Activity
  const act = report.activity;
  const pushText =
    act.lastPushedDaysAgo === 0
      ? 'today'
      : act.lastPushedDaysAgo === 1
        ? 'yesterday'
        : `${act.lastPushedDaysAgo} days ago`;
  const staleBadge = act.isStale
    ? chalk.bgRed.white.bold(' STALE ')
    : chalk.bgGreen.black.bold(' ACTIVE ');

  lines.push(
    `${chalk.bold('Maintenance & Activity:')} ${staleBadge}  ` +
      `Last push: ${chalk.cyan(pushText)}  ·  ` +
      `Commits (30d): ${chalk.yellow(act.commitsLast30Days.toLocaleString())}  ·  ` +
      `Commits (90d): ${chalk.magenta(act.commitsLast90Days.toLocaleString())}`
  );
  lines.push('');

  // Bus Factor & Contributor Distribution
  const bf = report.busFactor;
  const topText =
    bf.topContributors.length > 0
      ? bf.topContributors.map((c) => `${chalk.cyan(c.login)} (${c.percentage}%)`).join(', ')
      : 'None detected';

  lines.push(
    `${chalk.bold('Bus Factor:')} ${chalk.bold.yellow(bf.busFactor.toString())} ${renderRiskBadge(bf.risk)}  ` +
      `Gini Index: ${chalk.cyan(bf.giniCoefficient.toFixed(2))}  ·  ` +
      `Contributors: ${chalk.white(bf.totalContributors.toLocaleString())}`
  );
  lines.push(`  ${chalk.gray('Top maintainers:')} ${topText}`);
  lines.push('');

  // Overall Health Score
  lines.push(
    `${chalk.bold('Overall Health Score:')} ${renderScoreMeter(
      report.healthScore.compositeScore
    )}  ${renderGradeBadge(report.healthScore.grade)}`
  );
  lines.push(
    chalk.gray(
      `  Hygiene: ${report.healthScore.hygieneScore}/100 (40%)  ·  ` +
        `Activity: ${report.healthScore.activityScore}/100 (35%)  ·  ` +
        `Bus Factor: ${report.healthScore.busFactorScore}/100 (25%)`
    )
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
    const status = item.found ? chalk.green.bold('  ✓ PASS ') : chalk.red.bold('  ✗ FAIL ');

    const importanceLabel =
      item.importance === 'critical'
        ? chalk.red('Critical')
        : item.importance === 'recommended'
          ? chalk.yellow('Recommended')
          : chalk.gray('Optional');

    table.push([status, item.name, `${item.weight} pts`, importanceLabel]);
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
