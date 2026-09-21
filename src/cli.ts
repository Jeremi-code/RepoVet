import process from 'node:process';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { InvalidOptionsError, RepoVetError } from './domain/errors.js';
import { APP_VERSION } from './domain/models.js';
import { formatTerminalComparisonReport } from './formatters/comparison.formatter.js';
import { formatJsonReport } from './formatters/json.formatter.js';
import {
  formatMarkdownComparisonReport,
  formatMarkdownReport,
} from './formatters/markdown.formatter.js';
import { formatTerminalReport } from './formatters/terminal.formatter.js';
import { resolveGitHubToken } from './infrastructure/github/token.js';
import { AuditService } from './service/audit.service.js';

interface AuditCliOptions {
  json?: boolean;
  markdown?: boolean;
  minScore?: string;
  token?: string;
  cache: boolean;
}

interface CompareCliOptions {
  json?: boolean;
  markdown?: boolean;
  token?: string;
  cache: boolean;
}

function handleCliError(err: unknown, isJson: boolean): never {
  if (err instanceof RepoVetError) {
    if (isJson) {
      console.error(
        JSON.stringify(
          {
            error: {
              code: err.code,
              message: err.message,
              hint: err.hint,
            },
          },
          null,
          2
        )
      );
    } else {
      console.error('');
      console.error(`${chalk.bgRed.white.bold(' ERROR ')} ${chalk.red(err.message)}`);
      if (err.hint) {
        console.error(`${chalk.yellow.bold('💡 HINT: ')} ${chalk.yellow(err.hint)}`);
      }
      console.error('');
    }
    process.exit(err.exitCode);
  }

  const message = err instanceof Error ? err.message : String(err);
  if (isJson) {
    console.error(JSON.stringify({ error: { code: 'UNEXPECTED_ERROR', message } }, null, 2));
  } else {
    console.error('');
    console.error(`${chalk.bgRed.white.bold(' UNEXPECTED ERROR ')} ${chalk.red(message)}`);
    console.error('');
  }
  process.exit(2);
}

const program = new Command();

program
  .name('repovet')
  .description('Zero-clone, polyglot GitHub repository profiler and adoption vetting tool')
  .version(APP_VERSION);

program
  .command('audit <target>', { isDefault: true })
  .description('Vet a GitHub repository (e.g. "facebook/react" or full URL)')
  .option('-j, --json', 'Output results as structured JSON')
  .option('-m, --markdown', 'Output results as GitHub-Flavored Markdown')
  .option(
    '--min-score <score>',
    'Minimum composite score threshold required for CI/CD quality gate'
  )
  .option(
    '-t, --token <token>',
    'GitHub Personal Access Token (or set REPO_VET_TOKEN/GITHUB_TOKEN)'
  )
  .option('--no-cache', 'Bypass response caching')
  .action(async (target: string, options: AuditCliOptions) => {
    const isJson = Boolean(options.json);
    const isMarkdown = Boolean(options.markdown);
    const isSilent = isJson || isMarkdown;
    const spinner = isSilent
      ? null
      : ora({ text: `Vetting ${chalk.cyan(target)}...`, color: 'cyan' }).start();

    try {
      let minScoreThreshold: number | undefined;
      if (options.minScore !== undefined) {
        const parsed = Number(options.minScore);
        if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
          throw new InvalidOptionsError(
            `--min-score must be a valid number between 0 and 100. Received: "${options.minScore}"`,
            'Specify a numeric threshold between 0 and 100, e.g. --min-score 70'
          );
        }
        minScoreThreshold = parsed;
      }

      const token = resolveGitHubToken(options.token);
      const service = new AuditService({
        token,
      });

      const report = await service.audit(target);

      if (spinner) {
        spinner.stop();
      }

      if (isJson) {
        console.log(formatJsonReport(report));
      } else if (isMarkdown) {
        console.log(formatMarkdownReport(report));
      } else {
        console.log(formatTerminalReport(report));
      }

      // Quality gate evaluation
      if (
        minScoreThreshold !== undefined &&
        report.healthScore.compositeScore < minScoreThreshold
      ) {
        if (!isSilent) {
          console.error(
            chalk.bgRed.white.bold(' QUALITY GATE FAILED ') +
              ' ' +
              chalk.red.bold(
                `Composite score (${report.healthScore.compositeScore}/100) is below required threshold (${minScoreThreshold}/100).`
              )
          );
          console.error('');
        }
        process.exit(1);
      }

      process.exit(0);
    } catch (err: unknown) {
      if (spinner) {
        spinner.stop();
      }
      handleCliError(err, isJson);
    }
  });

program
  .command('compare <targets...>')
  .description('Compare two or more repositories side-by-side in battle mode')
  .option('-j, --json', 'Output results as structured JSON')
  .option('-m, --markdown', 'Output results as GitHub-Flavored Markdown')
  .option(
    '-t, --token <token>',
    'GitHub Personal Access Token (or set REPO_VET_TOKEN/GITHUB_TOKEN)'
  )
  .option('--no-cache', 'Bypass response caching')
  .action(async (targets: string[], options: CompareCliOptions) => {
    const isJson = Boolean(options.json);
    const isMarkdown = Boolean(options.markdown);
    const isSilent = isJson || isMarkdown;
    const spinner = isSilent
      ? null
      : ora({
          text: `Comparing ${chalk.cyan(targets.join(', '))} in battle mode...`,
          color: 'cyan',
        }).start();

    try {
      if (targets.length < 2) {
        throw new InvalidOptionsError(
          'Battle mode comparison requires at least two repository targets.',
          'Provide two or more repositories to compare: repovet compare repoA repoB'
        );
      }

      const token = resolveGitHubToken(options.token);
      const service = new AuditService({
        token,
      });

      const comparison = await service.compare(targets);

      if (spinner) {
        spinner.stop();
      }

      if (isJson) {
        console.log(JSON.stringify(comparison, null, 2));
      } else if (isMarkdown) {
        console.log(formatMarkdownComparisonReport(comparison));
      } else {
        console.log(formatTerminalComparisonReport(comparison));
      }

      process.exit(0);
    } catch (err: unknown) {
      if (spinner) {
        spinner.stop();
      }
      handleCliError(err, isJson);
    }
  });

program.parse(process.argv);
