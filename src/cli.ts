import process from 'node:process';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { RepoAuditError } from './domain/errors.js';
import { formatJsonReport } from './formatters/json.formatter.js';
import { formatTerminalReport } from './formatters/terminal.formatter.js';
import { resolveGitHubToken } from './infrastructure/github/token.js';
import { AuditService } from './service/audit.service.js';

interface CliOptions {
  json?: boolean;
  token?: string;
  cache: boolean;
}

const program = new Command();

program
  .name('repo-audit')
  .description('Zero-clone, polyglot GitHub repository profiler and adoption audit tool')
  .version('0.0.1')
  .argument('<target>', 'GitHub repository to audit (e.g. "facebook/react" or full URL)')
  .option('-j, --json', 'Output results as structured JSON')
  .option(
    '-t, --token <token>',
    'GitHub Personal Access Token (or set REPO_AUDIT_TOKEN/GITHUB_TOKEN)'
  )
  .option('--no-cache', 'Bypass response caching')
  .action(async (target: string, options: CliOptions) => {
    const isJson = Boolean(options.json);
    const spinner = isJson
      ? null
      : ora({ text: `Auditing ${chalk.cyan(target)}...`, color: 'cyan' }).start();

    try {
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
      } else {
        console.log(formatTerminalReport(report));
      }
      process.exit(0);
    } catch (err: unknown) {
      if (spinner) {
        spinner.stop();
      }

      if (err instanceof RepoAuditError) {
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
  });

program.parse(process.argv);
