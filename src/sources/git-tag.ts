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
 * The tag prefix (`v` by default) is auto-detected from existing tags
 * when writing, so projects using unprefixed tags (e.g. `1.0.0`) stay
 * consistent.
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
      // L-006: Use --match to prefer version-like tags over arbitrary ones
      const tag = this.describeVersionTag(cwd);
      return tag.replace(/^v/, '');
    } catch {
      throw new Error('No version tags found. Create a tag first (e.g., git tag v0.1.0)');
    }
  }

  setVersion(version: string, cwd: string): void {
    // H-005: Detect prefix convention from existing tags
    const prefix = this.detectPrefix(cwd);
    const tagName = `${prefix}${version}`;
    execFileSync('git', ['tag', '-a', tagName, '-m', `Release ${version}`], {
      cwd,
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  }

  /** Try version-like tag patterns, fall back to any tag. */
  private describeVersionTag(cwd: string): string {
    // Try v-prefixed semver tags first
    try {
      return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'], {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } catch {
      // Fall through
    }

    // Try unprefixed semver tags
    try {
      return execFileSync('git', ['describe', '--tags', '--abbrev=0', '--match', '[0-9]*'], {
        cwd,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
    } catch {
      throw new Error('No version tags found');
    }
  }

  /** Detect whether existing tags use a `v` prefix or not. */
  private detectPrefix(cwd: string): string {
    try {
      const tag = this.describeVersionTag(cwd);
      return tag.startsWith('v') ? 'v' : '';
    } catch {
      // No existing tags — default to `v` prefix
      return 'v';
    }
  }
}
