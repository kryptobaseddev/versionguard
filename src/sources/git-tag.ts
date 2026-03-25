/**
 * Git tag-based version source for Go, Swift, and similar ecosystems.
 *
 * @packageDocumentation
 */

import { execFileSync } from 'node:child_process';

import type { VersionSourceProvider } from './provider';

/**
 * Reads version from the latest Git tag. Writing creates a new annotated tag.
 *
 * This provider is used for languages where the version is determined
 * entirely by Git tags (Go, Swift, PHP/Packagist).
 *
 * @public
 * @since 0.3.0
 */
export class GitTagSource implements VersionSourceProvider {
  readonly name = 'git-tag';
  readonly manifestFile = '';

  exists(cwd: string): boolean {
    try {
      execFileSync('git', ['rev-parse', '--git-dir'], {
        cwd,
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      return true;
    } catch {
      return false;
    }
  }

  getVersion(cwd: string): string {
    try {
      const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();

      return tag.replace(/^v/, '');
    } catch {
      throw new Error('No git tags found. Create a tag first (e.g., git tag v0.1.0)');
    }
  }

  setVersion(version: string, cwd: string): void {
    const tagName = `v${version}`;
    execFileSync('git', ['tag', '-a', tagName, '-m', `Release ${version}`], {
      cwd,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  }
}
