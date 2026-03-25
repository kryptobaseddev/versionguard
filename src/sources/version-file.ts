/**
 * Plain text VERSION file provider.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { VersionSourceProvider } from './provider';

/**
 * Reads and writes version strings from a plain text VERSION file.
 *
 * @remarks
 * The file is expected to contain only the version string, optionally
 * followed by a trailing newline. Binary files and empty files are
 * rejected with a descriptive error.
 *
 * @public
 * @since 0.3.0
 */
export class VersionFileSource implements VersionSourceProvider {
  /** Human-readable provider name. */
  readonly name: string;

  /** Filename of the version file (e.g. `'VERSION'`). */
  readonly manifestFile: string;

  /**
   * Creates a new plain text version file source.
   *
   * @param manifestFile - Version filename.
   */
  constructor(manifestFile: string = 'VERSION') {
    this.name = manifestFile;
    this.manifestFile = manifestFile;
  }

  /**
   * Returns `true` when the version file exists in `cwd`.
   *
   * @param cwd - Project directory to check.
   * @returns Whether the version file exists.
   */
  exists(cwd: string): boolean {
    return fs.existsSync(path.join(cwd, this.manifestFile));
  }

  /**
   * Reads the version string from the plain text version file.
   *
   * @param cwd - Project directory containing the version file.
   * @returns The version string from the first line of the file.
   */
  getVersion(cwd: string): string {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const raw = fs.readFileSync(filePath, 'utf-8');

    // L-003: Guard against binary files
    if (raw.includes('\0')) {
      throw new Error(`${this.manifestFile} appears to be a binary file`);
    }

    // L-004: Only use the first line as the version
    const version = raw.split('\n')[0].trim();
    if (version.length === 0) {
      throw new Error(`${this.manifestFile} is empty`);
    }

    return version;
  }

  /**
   * Writes a version string to the plain text version file.
   *
   * @param version - Version string to write.
   * @param cwd - Project directory containing the version file.
   */
  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }
    fs.writeFileSync(filePath, `${version}\n`, 'utf-8');
  }
}
