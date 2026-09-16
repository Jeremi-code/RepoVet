import type { HygieneCheckItem, HygieneResult, RepoIdentifier } from '../domain/models.js';
import { calculateHygieneScore, HYGIENE_WEIGHTS } from '../domain/scoring.js';
import type { GitHubClient } from '../infrastructure/github/client.js';
import type { Analyzer } from './analyzer.interface.js';

export class HygieneAnalyzer implements Analyzer<HygieneResult> {
  public readonly name = 'hygiene';
  private readonly client: GitHubClient;

  constructor(client: GitHubClient) {
    this.client = client;
  }

  public async analyze(repo: RepoIdentifier): Promise<HygieneResult> {
    const { data: profile } = await this.client.getCommunityProfile(repo.owner, repo.name);

    const files = profile.files;

    const licenseFile = files.license;
    const readmeFile = files.readme;
    const securityFile = files.security;
    const contributingFile = files.contributing;
    const cocFile = files.code_of_conduct ?? files.code_of_conduct_file;

    const checks: HygieneCheckItem[] = [
      {
        id: 'license',
        name: 'Open Source License',
        description: 'Valid open source license detected in repository root or .github directory.',
        importance: 'critical',
        found: !!licenseFile?.html_url,
        path: licenseFile?.html_url,
        weight: HYGIENE_WEIGHTS.LICENSE,
      },
      {
        id: 'readme',
        name: 'README Documentation',
        description: 'Primary documentation explaining project purpose, setup, and usage.',
        importance: 'critical',
        found: !!readmeFile?.html_url,
        path: readmeFile?.html_url,
        weight: HYGIENE_WEIGHTS.README,
      },
      {
        id: 'security',
        name: 'Security Policy (SECURITY.md)',
        description: 'Instructions on how to responsibly disclose vulnerabilities.',
        importance: 'recommended',
        found: !!securityFile?.html_url,
        path: securityFile?.html_url,
        weight: HYGIENE_WEIGHTS.SECURITY,
      },
      {
        id: 'contributing',
        name: 'Contributing Guide (CONTRIBUTING.md)',
        description: 'Guidelines on submitting PRs, code style, and development environment.',
        importance: 'recommended',
        found: !!contributingFile?.html_url,
        path: contributingFile?.html_url,
        weight: HYGIENE_WEIGHTS.CONTRIBUTING,
      },
      {
        id: 'code-of-conduct',
        name: 'Code of Conduct (CODE_OF_CONDUCT.md)',
        description: 'Standards for maintaining an inclusive and respectful community.',
        importance: 'optional',
        found: !!cocFile?.html_url,
        path: cocFile?.html_url,
        weight: HYGIENE_WEIGHTS.CODE_OF_CONDUCT,
      },
    ];

    return calculateHygieneScore(checks);
  }
}
