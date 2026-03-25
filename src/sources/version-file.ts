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
 * The file is expected to contain only the version string, optionally
 * followed by a trailing newline.
 *
 * @public
 * @since 0.3.0
 */
export class VersionFileSource implements VersionSourceProvider {
  readonly name: string;
  readonly manifestFile: string;

  constructor(manifestFile: string = 'VERSION') {
    this.name = manifestFile;
    this.manifestFile = manifestFile;
  }

  exists(cwd: string): boolean {
    return fs.existsSync(path.join(cwd, this.manifestFile));
  }

  getVersion(cwd: string): string {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }

    const version = fs.readFileSync(filePath, 'utf-8').trim();
    if (version.length === 0) {
      throw new Error(`${this.manifestFile} is empty`);
    }

    return version;
  }

  setVersion(version: string, cwd: string): void {
    const filePath = path.join(cwd, this.manifestFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`${this.manifestFile} not found in ${cwd}`);
    }
    fs.writeFileSync(filePath, `${version}\n`, 'utf-8');
  }
}
