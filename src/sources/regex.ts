/**
 * Regex-based version source for source-code manifests.
 *
 * Handles gemspec, mix.exs, setup.py, build.gradle, etc.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { VersionSourceProvider } from './provider';

/**
 * Reads and writes version strings using regex extraction from source files.
 *
 * @remarks
 * Capture group 1 of the provided regex must match the version string.
 * Uses position-based replacement to avoid wrong-match corruption when
 * writing back to disk.
 *
 * @public
 * @since 0.3.0
 */
export class RegexVersionSource implements VersionSourceProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /** Filename of the source manifest (e.g. `'setup.py'`). */
  readonly manifestFile: string;

  /** Compiled regex used to locate the version string. */
  private readonly versionRegex: RegExp;

  /**
   * Creates a new regex version source.
   *
   * @param manifestFile - Source manifest filename.
   * @param versionRegex - Regex string with at least one capture group for the version.
   */
  constructor(manifestFile: string, versionRegex: string) {
    this.name = manifestFile;
    this.manifestFile = manifestFile;

    // C-001: Validate regex compiles and has at least one capture group
    try {
      this.versionRegex = new RegExp(versionRegex, 'm');
    } catch (err) {
      throw new Error(`Invalid version regex for ${manifestFile}: ${(err as Error).message}`);
    }

    // Verify at least one capture group exists
    if (!/\((?!\?)/.test(versionRegex)) {
      throw new Error(`Version regex for ${manifestFile} must contain at least one capture group`);
    }
  }

  /**
   * Returns `true` when the manifest file exists in `cwd`.
   *
   * @param cwd - Project directory to check.
   * @returns Whether the manifest file exists.
   */
  exists(cwd: string): boolean {
    return fs.existsSync(path.join(cwd, this.manifestFile));
  }

  /**
   * Reads the version string from the source manifest using regex extraction.
   *
   * @param cwd - Project directory containing the manifest.
   * @returns The version string captured by group 1 of the regex.
   */
  getVersion(cwd: string): string {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(this.versionRegex);

    if (!match?.[1]) {
      throw new Error(`No version match found in ${this.manifestFile}`);
    }

    return match[1];
  }

  /**
   * Writes a version string to the source manifest using position-based replacement.
   *
   * @param version - Version string to write.
   * @param cwd - Project directory containing the manifest.
   */
  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const match = this.versionRegex.exec(content);

    if (!match || match.index === undefined) {
      throw new Error(`No version match found in ${this.manifestFile}`);
    }

    // C-003: Use position-based replacement to avoid wrong-match corruption
    const captureStart = match.index + match[0].indexOf(match[1]);
    const captureEnd = captureStart + match[1].length;
    const updated = content.slice(0, captureStart) + version + content.slice(captureEnd);

    fs.writeFileSync(filePath, updated, 'utf-8');
  }
}
