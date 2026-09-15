import { describe, expect, it } from 'vitest';
import { InvalidRepoIdentifierError } from '../../src/domain/errors.js';
import { parseRepoIdentifier } from '../../src/domain/models.js';

describe('parseRepoIdentifier', () => {
  it('parses standard "owner/repo" slug', () => {
    const result = parseRepoIdentifier('facebook/react');
    expect(result).toEqual({ owner: 'facebook', name: 'react' });
  });

  it('parses full HTTPS GitHub URL', () => {
    const result = parseRepoIdentifier('https://github.com/vercel/next.js');
    expect(result).toEqual({ owner: 'vercel', name: 'next.js' });
  });

  it('parses SSH GitHub URL', () => {
    const result = parseRepoIdentifier('git@github.com:torvalds/linux.git');
    expect(result).toEqual({ owner: 'torvalds', name: 'linux' });
  });

  it('trims whitespace and trailing slashes', () => {
    const result = parseRepoIdentifier('  tailwindlabs/tailwindcss/  ');
    expect(result).toEqual({ owner: 'tailwindlabs', name: 'tailwindcss' });
  });

  it('throws on empty string', () => {
    expect(() => parseRepoIdentifier('')).toThrow(InvalidRepoIdentifierError);
  });

  it('throws on missing repo part', () => {
    expect(() => parseRepoIdentifier('facebook')).toThrow(InvalidRepoIdentifierError);
  });

  it('throws on invalid characters in owner or repo', () => {
    expect(() => parseRepoIdentifier('invalid@owner/repo')).toThrow(InvalidRepoIdentifierError);
  });
});
