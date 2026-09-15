import { RepoIdentifier } from '../domain/models.js';

export interface Analyzer<TResult> {
  readonly name: string;
  analyze(repo: RepoIdentifier): Promise<TResult>;
}
